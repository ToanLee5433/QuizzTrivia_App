/**
 * 🏷️ Auto-Tagging Pipeline v1.0
 * 
 * GIAI ĐOẠN 4: Tự động gắn tag khi quiz được duyệt
 * 
 * TRIGGER: Firestore onDocumentWritten
 * FLOW:
 * 1. Quiz status chuyển sang 'approved'
 * 2. Gemini generate 5-10 tags dựa trên title + description + questions
 * 3. Update tags vào quiz document
 * 4. Update chunk trong index với tags mới
 * 
 * BENEFITS:
 * - Cải thiện keyword search accuracy
 * - Tự động hóa, không cần admin gắn tag manual
 * - Multilingual tags (Vietnamese + English)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getStorage } from 'firebase-admin/storage';
import { invalidateGlobalCache } from './optimizedRAG';
import { invalidateOramaCache } from './oramaEngine';

// ============================================================
// 📊 TYPE DEFINITIONS
// ============================================================

interface QuizData {
  title: string;
  description?: string;
  category?: string;
  difficulty?: string;
  status: string;
  questions?: Array<{
    question: string;
    options?: string[];
  }>;
  tags?: string[];
  autoTags?: string[];
  autoTaggedAt?: number;
  tagStatus?: 'pending_review' | 'approved' | 'rejected';  // NEW v4.1: Tag quality control
  tagReviewedBy?: string;  // NEW v4.1: Admin who reviewed
  tagReviewedAt?: number;  // NEW v4.1: Review timestamp
}

interface IndexChunk {
  chunkId: string;
  quizId?: string;
  text: string;
  title: string;
  embedding: number[];
  metadata?: {
    title: string;
    summary?: string;
    category?: string;
    difficulty?: string;
    tags?: string[];
  };
}

interface VectorIndex {
  version: string;
  createdAt: number;
  totalChunks: number;
  chunks: IndexChunk[];
  sources: Record<string, number>;
}

// ============================================================
// 🧠 GEMINI TAG GENERATION
// ============================================================

const EMBEDDING_MODEL = 'text-embedding-004';
const CHAT_MODEL = 'gemini-2.5-flash-lite';

/**
 * Generate tags for a quiz using Gemini
 * 
 * Output: 5-10 tags covering:
 * - Subject/Topic (JavaScript, React, etc.)
 * - Skill level (beginner, intermediate, advanced)
 * - Domain (web development, mobile, etc.)
 * - Keywords from questions
 */
async function generateTagsWithAI(quizData: QuizData): Promise<string[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY not set');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: CHAT_MODEL });
  
  // Build context from quiz data
  const questionsText = quizData.questions
    ?.slice(0, 10) // Limit to 10 questions to reduce token usage
    .map((q, idx) => `${idx + 1}. ${q.question}`)
    .join('\n') || '';
  
  const prompt = `Bạn là chuyên gia phân loại nội dung học tập. Phân tích quiz sau và tạo tags.

**THÔNG TIN QUIZ:**
- Tiêu đề: ${quizData.title}
- Mô tả: ${quizData.description || 'Không có'}
- Danh mục: ${quizData.category || 'Chưa phân loại'}
- Độ khó: ${quizData.difficulty || 'Chưa xác định'}

**MẪU CÂU HỎI:**
${questionsText || 'Không có câu hỏi mẫu'}

**YÊU CẦU TẠO TAGS:**
1. Tạo 5-10 tags mô tả chính xác nội dung quiz
2. Tags phải là từ khóa ngắn gọn (1-3 từ)
3. Bao gồm cả tiếng Việt và tiếng Anh nếu phù hợp
4. Các loại tag cần có:
   - Chủ đề chính (JavaScript, Python, React, etc.)
   - Lĩnh vực (web development, mobile, data science, etc.)
   - Kỹ năng (programming, algorithms, design patterns, etc.)
   - Từ khóa nổi bật từ câu hỏi

**VÍ DỤ:**
Quiz "JavaScript Cơ bản" → ["JavaScript", "JS", "lập trình web", "web development", "frontend", "beginner", "ES6", "variables", "functions"]

**TRẢ VỀ JSON ARRAY (không có markdown):**`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Parse JSON (remove markdown if present)
    const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const tags = JSON.parse(jsonStr) as string[];
    
    // Validate and clean tags
    const cleanedTags = tags
      .filter(tag => typeof tag === 'string' && tag.length > 0)
      .map(tag => tag.toLowerCase().trim())
      .filter(tag => tag.length >= 2 && tag.length <= 50)
      .slice(0, 10); // Max 10 tags
    
    console.log(`🏷️ Generated ${cleanedTags.length} tags for quiz "${quizData.title}":`, cleanedTags);
    
    return cleanedTags;
  } catch (error) {
    console.error('❌ Tag generation failed:', error);
    
    // Fallback: generate basic tags from title and category
    const fallbackTags: string[] = [];
    
    if (quizData.title) {
      // Extract words from title
      const titleWords = quizData.title
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length >= 3);
      fallbackTags.push(...titleWords.slice(0, 3));
    }
    
    if (quizData.category) {
      fallbackTags.push(quizData.category.toLowerCase());
    }
    
    if (quizData.difficulty) {
      fallbackTags.push(quizData.difficulty.toLowerCase());
    }
    
    return [...new Set(fallbackTags)];
  }
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

// ============================================================
// 📦 INDEX UPDATE FUNCTIONS
// ============================================================

/**
 * Load current index from Storage
 */
async function loadCurrentIndex(): Promise<VectorIndex | null> {
  try {
    const bucket = getStorage().bucket('datn-quizapp.firebasestorage.app');
    const indexFile = bucket.file('rag/indices/vector-index.json');
    
    const [exists] = await indexFile.exists();
    if (!exists) {
      console.log('⚠️ Index file does not exist');
      return null;
    }
    
    const [content] = await indexFile.download();
    return JSON.parse(content.toString('utf-8')) as VectorIndex;
  } catch (error) {
    console.error('❌ Failed to load index:', error);
    return null;
  }
}

/**
 * Save updated index to Storage
 */
async function saveIndex(index: VectorIndex): Promise<void> {
  try {
    const bucket = getStorage().bucket('datn-quizapp.firebasestorage.app');
    const indexFile = bucket.file('rag/indices/vector-index.json');
    
    await indexFile.save(JSON.stringify(index, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'no-cache',
      },
    });
    
    console.log('✅ Index saved successfully');
  } catch (error) {
    console.error('❌ Failed to save index:', error);
    throw error;
  }
}

/**
 * Update chunks in index with new tags
 */
async function updateIndexWithTags(
  quizId: string,
  newTags: string[]
): Promise<void> {
  const index = await loadCurrentIndex();
  if (!index) {
    console.log('⚠️ No index to update');
    return;
  }
  
  let updated = false;
  
  for (const chunk of index.chunks) {
    if (chunk.quizId === quizId) {
      // Update tags in metadata
      if (!chunk.metadata) {
        chunk.metadata = { title: chunk.title };
      }
      chunk.metadata.tags = newTags;
      updated = true;
    }
  }
  
  if (updated) {
    // Update version
    index.version = `1.1.${Date.now()}`;
    
    await saveIndex(index);
    
    // Invalidate caches
    invalidateGlobalCache();
    invalidateOramaCache();
    
    console.log(`✅ Updated index with tags for quiz ${quizId}`);
  } else {
    console.log(`⚠️ No chunks found for quiz ${quizId}`);
  }
}

/**
 * Add new quiz to index (if not exists)
 */
async function addQuizToIndex(
  quizId: string,
  quizData: QuizData,
  tags: string[]
): Promise<void> {
  const index = await loadCurrentIndex();
  if (!index) {
    console.log('⚠️ No index exists, skip adding quiz');
    return;
  }
  
  // Check if quiz already indexed
  const existingChunk = index.chunks.find(c => c.quizId === quizId);
  if (existingChunk) {
    // Just update tags
    await updateIndexWithTags(quizId, tags);
    return;
  }
  
  // Create new chunk for quiz
  const chunkText = buildQuizChunkText(quizData, tags);
  const embedding = await generateEmbedding(chunkText);
  
  const newChunk: IndexChunk = {
    chunkId: `quiz_${quizId}_meta`,
    quizId,
    text: chunkText,
    title: quizData.title,
    embedding,
    metadata: {
      title: quizData.title,
      summary: quizData.description?.substring(0, 200),
      category: quizData.category,
      difficulty: quizData.difficulty,
      tags,
    },
  };
  
  // Add questions as separate chunks
  const questionChunks: IndexChunk[] = [];
  if (quizData.questions && quizData.questions.length > 0) {
    for (let i = 0; i < quizData.questions.length; i++) {
      const q = quizData.questions[i];
      const qText = `Câu hỏi từ quiz "${quizData.title}": ${q.question}`;
      const qEmbedding = await generateEmbedding(qText);
      
      questionChunks.push({
        chunkId: `quiz_${quizId}_q${i + 1}`,
        quizId,
        text: qText,
        title: `${quizData.title} - Câu ${i + 1}`,
        embedding: qEmbedding,
        metadata: {
          title: quizData.title,
          category: quizData.category,
          difficulty: quizData.difficulty,
          tags,
        },
      });
    }
  }
  
  // Add to index
  index.chunks.push(newChunk, ...questionChunks);
  index.totalChunks = index.chunks.length;
  index.sources[quizId] = 1 + questionChunks.length;
  index.version = `1.1.${Date.now()}`;
  
  await saveIndex(index);
  
  // Invalidate caches
  invalidateGlobalCache();
  invalidateOramaCache();
  
  console.log(`✅ Added quiz ${quizId} to index with ${questionChunks.length} question chunks`);
}

/**
 * Remove quiz from index (DELETE operation)
 * Called when quiz is deleted or unapproved
 */
async function removeQuizFromIndex(quizId: string): Promise<void> {
  console.log(`➖ Removing quiz from index: ${quizId}`);
  
  const index = await loadCurrentIndex();
  if (!index) {
    console.log('⚠️ No index found, nothing to remove');
    return;
  }
  
  // Count chunks before removal
  const beforeCount = index.chunks.length;
  
  // Remove all chunks for this quiz (meta + questions)
  index.chunks = index.chunks.filter(c => 
    !c.chunkId.startsWith(`quiz_${quizId}_`) && c.quizId !== quizId
  );
  
  const removedCount = beforeCount - index.chunks.length;
  
  if (removedCount === 0) {
    console.log(`ℹ️ No chunks found for quiz ${quizId}`);
    return;
  }
  
  // Update metadata
  index.totalChunks = index.chunks.length;
  delete index.sources[quizId];
  index.version = `1.1.${Date.now()}`;
  
  // Save updated index
  await saveIndex(index);
  
  // Invalidate caches
  invalidateGlobalCache();
  invalidateOramaCache();
  
  console.log(`✅ Removed ${removedCount} chunks for quiz ${quizId}`);
}

/**
 * Build text content for quiz chunk
 */
function buildQuizChunkText(quizData: QuizData, tags: string[]): string {
  const parts = [
    `Tiêu đề: ${quizData.title}`,
    quizData.description ? `Mô tả: ${quizData.description}` : '',
    quizData.category ? `Danh mục: ${quizData.category}` : '',
    quizData.difficulty ? `Độ khó: ${quizData.difficulty}` : '',
    tags.length > 0 ? `Tags: ${tags.join(', ')}` : '',
  ];
  
  return parts.filter(Boolean).join('\n');
}

// ============================================================
// 🔥 FIRESTORE TRIGGER: Auto-Tag on Quiz Approval
// ============================================================

/**
 * Firestore Trigger: Auto-generate tags when quiz is approved
 * 
 * Triggers when:
 * 1. Quiz status changes to 'approved'
 * 2. Quiz is newly created with status 'approved'
 * 
 * Actions:
 * 1. Generate tags using Gemini AI
 * 2. Update quiz document with tags
 * 3. Update/add quiz to vector index
 */
export const autoTagOnApproval = functions
  .region('us-central1')
  .runWith({
    secrets: ['GOOGLE_AI_API_KEY'],
    timeoutSeconds: 120,
    memory: '512MB',
  })
  .firestore.document('quizzes/{quizId}')
  .onWrite(async (change, context) => {
    const quizId = context.params.quizId;
    
    // Get before/after data
    const beforeData = change.before.exists ? change.before.data() as QuizData : null;
    const afterData = change.after.exists ? change.after.data() as QuizData : null;
    
    // ============================================
    // CASE 1: Quiz bị XÓA → Remove from index
    // ============================================
    if (!afterData) {
      // Chỉ xóa khỏi index nếu quiz đã từng được approved (đã được index)
      if (beforeData?.status === 'approved') {
        console.log(`🗑️ Quiz ${quizId} deleted. Removing from index...`);
        try {
          await removeQuizFromIndex(quizId);
          
          // Log event
          await admin.firestore().collection('system').doc('rag-logs').collection('events').add({
            type: 'quiz_deleted_from_index',
            quizId,
            quizTitle: beforeData?.title || 'Unknown',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            success: true,
          });
          
          console.log(`✅ Deleted quiz ${quizId} removed from index`);
        } catch (error) {
          console.error(`❌ Failed to remove deleted quiz ${quizId}:`, error);
        }
      } else {
        console.log(`ℹ️ Deleted quiz ${quizId} was not indexed (status: ${beforeData?.status})`);
      }
      return null;
    }
    
    // ============================================
    // CASE 2: Quiz bị HỦY DUYỆT → Remove from index
    // ============================================
    const wasApproved = beforeData?.status === 'approved';
    const isNowApproved = afterData.status === 'approved';
    
    if (wasApproved && !isNowApproved) {
      console.log(`🚫 Quiz ${quizId} no longer approved (${afterData.status}). Removing from index...`);
      try {
        await removeQuizFromIndex(quizId);
        
        // Log event
        await admin.firestore().collection('system').doc('rag-logs').collection('events').add({
          type: 'quiz_unapproved_removed',
          quizId,
          quizTitle: afterData.title,
          newStatus: afterData.status,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          success: true,
        });
        
        console.log(`✅ Unapproved quiz ${quizId} removed from index`);
      } catch (error) {
        console.error(`❌ Failed to remove unapproved quiz ${quizId}:`, error);
      }
      return null;
    }
    
    // ============================================
    // CASE 3: Quiz được DUYỆT → Auto-tag + Add to index
    // ============================================
    const wasNotApproved = !beforeData || beforeData.status !== 'approved';
    const needsNewTags = !afterData.autoTaggedAt || 
      (beforeData && beforeData.title !== afterData.title);
    
    // Only process if:
    // 1. Newly approved, OR
    // 2. Already approved but title changed (re-tag needed)
    if (!isNowApproved || (!wasNotApproved && !needsNewTags)) {
      console.log(`⏭️ Quiz ${quizId} - no auto-tag needed (status: ${afterData.status})`);
      return null;
    }
    
    console.log(`🏷️ Auto-tagging quiz ${quizId}: "${afterData.title}"`);
    
    try {
      // 1. Generate tags with AI
      const generatedTags = await generateTagsWithAI(afterData);
      
      // 2. Merge with existing manual tags
      const existingTags = afterData.tags || [];
      const allTags = [...new Set([...existingTags, ...generatedTags])];
      
      // 3. Update quiz document with tagStatus for quality control
      await admin.firestore()
        .collection('quizzes')
        .doc(quizId)
        .update({
          autoTags: generatedTags,
          tags: allTags,
          autoTaggedAt: Date.now(),
          tagStatus: 'pending_review',  // NEW v4.1: Requires admin review
        });
      
      console.log(`✅ Quiz ${quizId} auto-tagged with ${generatedTags.length} tags (pending review)`);
      
      // 4. Update/add to index
      await addQuizToIndex(quizId, afterData, allTags);
      
      // 5. Log event for admin monitoring
      await admin.firestore().collection('system').doc('rag-logs').collection('tag_reviews').add({
        quizId,
        quizTitle: afterData.title,
        generatedTags,
        status: 'pending_review',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      return { success: true, quizId, tags: allTags };
    } catch (error) {
      console.error(`❌ Auto-tag failed for quiz ${quizId}:`, error);
      return { success: false, quizId, error: String(error) };
    }
  });

// ============================================================
// 🔧 MANUAL TAG GENERATION (Callable Function)
// ============================================================

/**
 * Manual tag generation for existing quizzes
 * Can be called by admin to re-generate tags
 */
export const regenerateTags = functions
  .region('us-central1')
  .runWith({
    secrets: ['GOOGLE_AI_API_KEY'],
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Bạn cần đăng nhập để sử dụng tính năng này'
      );
    }
    
    const { quizId } = data;
    if (!quizId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'quizId is required'
      );
    }
    
    // Get quiz data
    const quizDoc = await admin.firestore()
      .collection('quizzes')
      .doc(quizId)
      .get();
    
    if (!quizDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Quiz not found'
      );
    }
    
    const quizData = quizDoc.data() as QuizData;
    
    // Check permission (owner or admin)
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();
    
    const userData = userDoc.data();
    const isAdmin = userData?.role === 'admin';
    const isOwner = quizData && (quizData as any).createdBy === context.auth.uid;
    
    if (!isAdmin && !isOwner) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Bạn không có quyền cập nhật tags cho quiz này'
      );
    }
    
    // Generate new tags
    const generatedTags = await generateTagsWithAI(quizData);
    
    // Merge with existing manual tags
    const existingTags = quizData.tags || [];
    const allTags = [...new Set([...existingTags, ...generatedTags])];
    
    // Update quiz
    await admin.firestore()
      .collection('quizzes')
      .doc(quizId)
      .update({
        autoTags: generatedTags,
        tags: allTags,
        autoTaggedAt: Date.now(),
      });
    
    // Update index
    await updateIndexWithTags(quizId, allTags);
    
    return {
      success: true,
      quizId,
      generatedTags,
      allTags,
    };
  });

// ============================================================
// 📊 BATCH TAG GENERATION (Admin Only)
// ============================================================

/**
 * Batch generate tags for all approved quizzes
 * Admin-only function for initial tagging
 */
export const batchGenerateTags = functions
  .region('us-central1')
  .runWith({
    secrets: ['GOOGLE_AI_API_KEY'],
    timeoutSeconds: 540, // 9 minutes
    memory: '1GB',
  })
  .https.onCall(async (_data, context) => {
    // Check admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Bạn cần đăng nhập'
      );
    }
    
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();
    
    const userData = userDoc.data();
    if (!userData || userData.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Chỉ admin mới có thể batch generate tags'
      );
    }
    
    // Get all approved quizzes without auto-tags
    const quizzesSnap = await admin.firestore()
      .collection('quizzes')
      .where('status', '==', 'approved')
      .get();
    
    const results: Array<{ quizId: string; success: boolean; tags?: string[]; error?: string }> = [];
    
    for (const doc of quizzesSnap.docs) {
      const quizId = doc.id;
      const quizData = doc.data() as QuizData;
      
      // Skip if already auto-tagged recently (within 7 days)
      if (quizData.autoTaggedAt && (Date.now() - quizData.autoTaggedAt) < 7 * 24 * 60 * 60 * 1000) {
        console.log(`⏭️ Skipping ${quizId} - recently tagged`);
        results.push({ quizId, success: true, tags: quizData.autoTags });
        continue;
      }
      
      try {
        const generatedTags = await generateTagsWithAI(quizData);
        const existingTags = quizData.tags || [];
        const allTags = [...new Set([...existingTags, ...generatedTags])];
        
        await admin.firestore()
          .collection('quizzes')
          .doc(quizId)
          .update({
            autoTags: generatedTags,
            tags: allTags,
            autoTaggedAt: Date.now(),
          });
        
        results.push({ quizId, success: true, tags: allTags });
        console.log(`✅ Tagged ${quizId}: ${generatedTags.length} tags`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Failed to tag ${quizId}:`, error);
        results.push({ quizId, success: false, error: String(error) });
      }
    }
    
    // Rebuild index after batch tagging
    console.log('🔄 Rebuilding index after batch tagging...');
    invalidateGlobalCache();
    invalidateOramaCache();
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    return {
      total: results.length,
      success: successCount,
      failed: failCount,
      results,
    };
  });

// ============================================================
// 🛡️ TAG REVIEW FUNCTIONS (v4.1 - Quality Control)
// ============================================================

/**
 * Admin function to review and approve/reject auto-generated tags
 * 
 * Actions:
 * - approve: Accept auto-generated tags as-is
 * - reject: Remove auto-tags and clear from index
 * - modify: Accept with modifications (admin provides updated tags)
 */
export const reviewTags = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .https.onCall(async (data, context) => {
    // Check admin authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Bạn cần đăng nhập'
      );
    }
    
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();
    
    const userData = userDoc.data();
    if (!userData || userData.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Chỉ admin mới có thể review tags'
      );
    }
    
    const { quizId, action, modifiedTags } = data;
    
    if (!quizId || !action) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'quizId and action are required'
      );
    }
    
    if (!['approve', 'reject', 'modify'].includes(action)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'action must be "approve", "reject", or "modify"'
      );
    }
    
    const quizRef = admin.firestore().collection('quizzes').doc(quizId);
    const quizDoc = await quizRef.get();
    
    if (!quizDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Quiz không tồn tại'
      );
    }
    
    const quizData = quizDoc.data() as QuizData;
    const now = Date.now();
    
    try {
      switch (action) {
        case 'approve':
          // Approve tags as-is
          await quizRef.update({
            tagStatus: 'approved',
            tagReviewedBy: context.auth.uid,
            tagReviewedAt: now,
          });
          console.log(`✅ Tags approved for quiz ${quizId}`);
          break;
          
        case 'reject':
          // Remove auto-tags, mark as rejected
          await quizRef.update({
            autoTags: admin.firestore.FieldValue.delete(),
            tags: quizData.tags?.filter(t => !quizData.autoTags?.includes(t)) || [],
            tagStatus: 'rejected',
            tagReviewedBy: context.auth.uid,
            tagReviewedAt: now,
          });
          console.log(`❌ Tags rejected for quiz ${quizId}`);
          break;
          
        case 'modify':
          // Update with admin-modified tags
          if (!modifiedTags || !Array.isArray(modifiedTags)) {
            throw new functions.https.HttpsError(
              'invalid-argument',
              'modifiedTags array is required for modify action'
            );
          }
          
          await quizRef.update({
            autoTags: modifiedTags,
            tags: [...new Set([...(quizData.tags || []).filter(t => !quizData.autoTags?.includes(t)), ...modifiedTags])],
            tagStatus: 'approved',
            tagReviewedBy: context.auth.uid,
            tagReviewedAt: now,
          });
          console.log(`✏️ Tags modified for quiz ${quizId}: ${modifiedTags.join(', ')}`);
          break;
      }
      
      // Log the review action
      await admin.firestore().collection('system').doc('rag-logs').collection('tag_reviews').add({
        quizId,
        quizTitle: quizData.title,
        action,
        originalTags: quizData.autoTags,
        modifiedTags: action === 'modify' ? modifiedTags : undefined,
        reviewedBy: context.auth.uid,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      return {
        success: true,
        quizId,
        action,
        message: `Tags ${action}ed successfully`,
      };
    } catch (error) {
      console.error(`❌ Tag review failed for quiz ${quizId}:`, error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to ${action} tags: ${error}`
      );
    }
  });

/**
 * Get list of quizzes pending tag review
 */
export const getPendingTagReviews = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB',
  })
  .https.onCall(async (_data, context) => {
    // Check admin authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Bạn cần đăng nhập'
      );
    }
    
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();
    
    const userData = userDoc.data();
    if (!userData || userData.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Chỉ admin mới có thể xem pending reviews'
      );
    }
    
    // Get quizzes with pending tag review
    const pendingSnap = await admin.firestore()
      .collection('quizzes')
      .where('tagStatus', '==', 'pending_review')
      .orderBy('autoTaggedAt', 'desc')
      .limit(50)
      .get();
    
    const pendingReviews = pendingSnap.docs.map(doc => {
      const data = doc.data();
      return {
        quizId: doc.id,
        title: data.title,
        category: data.category,
        autoTags: data.autoTags || [],
        existingTags: data.tags || [],
        autoTaggedAt: data.autoTaggedAt,
      };
    });
    
    return {
      total: pendingReviews.length,
      reviews: pendingReviews,
    };
  });

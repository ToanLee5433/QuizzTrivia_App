/**
 * 🤖 Simple RAG Implementation for Cloud Functions
 * 
 * Direct implementation without Genkit
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as admin from 'firebase-admin';

// ✅ Secure: API key from environment variable (lazy initialization)
// Updated: 2025-11-25 - Fixed secret configuration
function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
}

interface RAGContext {
  text: string;
  title: string;
  quizId?: string;
  score: number;
}

/**
 * Generate embedding
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });
  
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Cosine similarity
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Vector search
 */
async function vectorSearch(
  question: string,
  topK: number = 4
): Promise<RAGContext[]> {
  // Get index from Firestore
  const indexDoc = await admin.firestore()
    .collection('system')
    .doc('vector-index')
    .get();
  
  if (!indexDoc.exists) {
    // Return empty if no index yet
    return [];
  }
  
  const index = indexDoc.data();
  
  if (!index || !index.chunks || index.chunks.length === 0) {
    return [];
  }
  
  // Generate question embedding
  const questionEmbedding = await generateEmbedding(question);
  
  // Calculate similarities
  const results = index.chunks.map((chunk: any) => ({
    text: chunk.text,
    title: chunk.title,
    quizId: chunk.quizId,
    score: cosineSimilarity(questionEmbedding, chunk.embedding),
  }));
  
  // Sort and take top K
  results.sort((a: any, b: any) => b.score - a.score);
  return results.slice(0, topK);
}

/**
 * Generate answer
 */
async function generateAnswer(
  question: string,
  contexts: RAGContext[],
  targetLang: string = 'vi'
): Promise<{ answer: string; tokensUsed: { input: number; output: number } }> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  
  // If no contexts, give a friendly message
  if (contexts.length === 0) {
    return {
      answer: `Xin chào! 👋 Hiện tại hệ thống chưa có dữ liệu quiz để trả lời câu hỏi của bạn.

📝 Để AI có thể hỗ trợ bạn, admin cần:
1. Vào /admin/build-index để xây dựng cơ sở tri thức
2. Hoặc thêm quiz mới vào hệ thống

Trong thời gian chờ đợi, bạn có thể:
- Khám phá các quiz hiện có trên trang chủ
- Tạo quiz riêng của bạn
- Xem thống kê và thành tích

Cảm ơn bạn đã sử dụng! 🚀`,
      tokensUsed: { input: 0, output: 0 },
    };
  }
  
  // Build context
  const contextStr = contexts
    .map((ctx, i) => `[${i + 1}] ${ctx.title}\n${ctx.text}`)
    .join('\n\n');
  
  const prompt = `Bạn là AI Learning Assistant - trợ lý học tập thông minh.

**NHIỆM VỤ:**
Dựa vào thông tin từ quiz/tài liệu, trả lời câu hỏi chi tiết và dễ hiểu.

**QUY TẮC QUAN TRỌNG:**
- KHÔNG liệt kê danh sách quiz trong câu trả lời
- Quiz recommendations sẽ được hiển thị tự động bên dưới
- Chỉ giải thích nội dung, khái niệm, ví dụ
- Nếu người dùng hỏi về quiz, chỉ nói "Dưới đây là các quiz phù hợp cho bạn" (không list chi tiết)

**PHONG CÁCH:**
- Thân thiện, nhiệt tình
- Giải thích từ cơ bản đến nâng cao
- Sử dụng ví dụ thực tế
- Dùng emoji cho sinh động
- Khuyến khích suy nghĩ

**ĐỊNH DẠNG:**
📚 **Giải Thích:** [Chi tiết nội dung]
💡 **Ví Dụ:** [Thực tế nếu có]
✅ **Ghi Nhớ:** [Mẹo nếu phù hợp]
🎯 **Gợi Ý:** [Dưới đây là các quiz phù hợp]

Trích dẫn nguồn: [1], [2], etc.

---

**CONTEXT:**
${contextStr}

---

**CÂU HỎI:**
${question}

**TRẢ LỜI:**`;

  const result = await model.generateContent(prompt);
  const answer = result.response.text();
  
  return {
    answer,
    tokensUsed: {
      input: Math.ceil(prompt.length / 4),
      output: Math.ceil(answer.length / 4),
    },
  };
}

/**
 * Main RAG function
 */
export async function askQuestion(params: {
  question: string;
  topK?: number;
  targetLang?: string;
}): Promise<{
  answer: string;
  citations: Array<{ title: string; quizId?: string }>;
  quizRecommendations?: Array<{
    quizId: string;
    title: string;
    description?: string;
    imageUrl?: string;
    difficulty?: string;
    category?: string;
    questionCount?: number;
    averageRating?: number;
    totalAttempts?: number;
  }>;
  usedChunks: number;
  processingTime: number;
  tokensUsed: { input: number; output: number };
}> {
  const startTime = Date.now();
  const { question, topK = 4, targetLang = 'vi' } = params;
  
  // 1. Vector search
  const contexts = await vectorSearch(question, topK);
  
  // 2. Generate answer
  const { answer, tokensUsed } = await generateAnswer(question, contexts, targetLang);
  
  // 3. Extract citations and quiz IDs
  const citations = contexts.map(ctx => ({
    title: ctx.title,
    quizId: ctx.quizId,
  }));
  
  // 4. Get unique quiz IDs and fetch full quiz details
  const uniqueQuizIds = [...new Set(contexts
    .map(ctx => ctx.quizId)
    .filter(id => id != null))] as string[];
  
  const quizRecommendations = [];
  
  if (uniqueQuizIds.length > 0) {
    // Fetch quiz details from Firestore
    const quizzesRef = admin.firestore().collection('quizzes');
    
    for (const quizId of uniqueQuizIds.slice(0, 4)) { // Limit to top 4 quizzes
      try {
        const quizDoc = await quizzesRef.doc(quizId).get();
        
        if (quizDoc.exists) {
          const quizData = quizDoc.data();
          
          // Only include approved quizzes
          if (quizData && quizData.status === 'approved') {
            quizRecommendations.push({
              quizId,
              title: quizData.title || 'Untitled Quiz',
              description: quizData.description || '',
              imageUrl: quizData.imageUrl || null,
              difficulty: quizData.difficulty || 'medium',
              category: quizData.category || 'Uncategorized',
              questionCount: quizData.questionCount || 0,
              averageRating: quizData.stats?.averageRating || 0,
              totalAttempts: quizData.stats?.totalAttempts || 0,
            });
          }
        }
      } catch (error) {
        console.error(`Failed to fetch quiz ${quizId}:`, error);
      }
    }
  }
  
  return {
    answer,
    citations,
    quizRecommendations: quizRecommendations.length > 0 ? quizRecommendations : undefined,
    usedChunks: contexts.length,
    processingTime: Date.now() - startTime,
    tokensUsed,
  };
}

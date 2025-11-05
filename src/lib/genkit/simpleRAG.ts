/**
 * 🏗️ Simple RAG Flow - Direct Implementation
 * 
 * Simplified RAG without Genkit dependency
 * Uses Google AI API directly
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_AI_API_KEY = 'AIzaSyDQT4sxlCRVxm0xqvfzaBIobv-3y8KfV-k';

interface RAGContext {
  text: string;
  title: string;
  quizId?: string;
  score: number;
}

interface RAGResponse {
  answer: string;
  citations: Array<{ title: string; quizId?: string }>;
  usedChunks: number;
  processingTime: number;
  tokensUsed: { input: number; output: number };
}

/**
 * Generate embedding using Google AI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Calculate cosine similarity between two vectors
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
 * Simple vector search in local storage index
 */
async function vectorSearch(
  question: string,
  topK: number = 4
): Promise<RAGContext[]> {
  // Get index from localStorage
  const indexStr = localStorage.getItem('vector-index');
  if (!indexStr) {
    throw new Error('Vector index not found. Please build index first.');
  }
  
  const index = JSON.parse(indexStr);
  
  // Generate question embedding
  const questionEmbedding = await generateEmbedding(question);
  
  // Calculate similarities
  const results = index.chunks.map((chunk: any) => ({
    text: chunk.text,
    title: chunk.title,
    quizId: chunk.quizId,
    score: cosineSimilarity(questionEmbedding, chunk.embedding),
  }));
  
  // Sort by similarity and take top K
  results.sort((a: any, b: any) => b.score - a.score);
  return results.slice(0, topK);
}

/**
 * Generate answer using retrieved context
 */
async function generateAnswer(
  question: string,
  contexts: RAGContext[],
  targetLang: string = 'vi'
): Promise<{ answer: string; tokensUsed: { input: number; output: number } }> {
  const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  // Build context string
  const contextStr = contexts
    .map((ctx, i) => `[${i + 1}] ${ctx.title}\n${ctx.text}`)
    .join('\n\n');
  
  const prompt = `Bạn là AI Learning Assistant - trợ lý học tập thông minh cho sinh viên.

**NHIỆM VỤ:**
Dựa vào các thông tin từ quiz/tài liệu bên dưới, hãy trả lời câu hỏi của sinh viên một cách chi tiết và dễ hiểu.

**PHONG CÁCH:**
- Thân thiện, nhiệt tình như một người bạn học
- Giải thích từ cơ bản đến nâng cao
- Sử dụng ví dụ thực tế để minh họa
- Dùng emoji để tạo không khí thoải mái
- Khuyến khích suy nghĩ và học hỏi

**ĐỊNH DẠNG TRẢ LỜI:**
📚 **Giải Thích:** [Giải thích chi tiết]
💡 **Ví Dụ:** [Ví dụ thực tế nếu có]
✅ **Ghi Nhớ:** [Mẹo ghi nhớ nếu phù hợp]
🎯 **Luyện Tập:** [Gợi ý quiz liên quan]

Luôn trích dẫn nguồn bằng [1], [2], etc. khi sử dụng thông tin từ context.

---

**CONTEXT TỪ QUIZ/TÀI LIỆU:**

${contextStr}

---

**CÂU HỎI CỦA SINH VIÊN:**
${question}

**TRẢ LỜI (bằng ${targetLang === 'vi' ? 'Tiếng Việt' : 'English'}):**`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const answer = response.text();
  
  // Estimate tokens (rough approximation)
  const inputTokens = Math.ceil(prompt.length / 4);
  const outputTokens = Math.ceil(answer.length / 4);
  
  return {
    answer,
    tokensUsed: {
      input: inputTokens,
      output: outputTokens,
    },
  };
}

/**
 * Main RAG flow
 */
export async function askQuestion(params: {
  question: string;
  topK?: number;
  targetLang?: string;
}): Promise<RAGResponse> {
  const startTime = Date.now();
  
  const { question, topK = 4, targetLang = 'vi' } = params;
  
  try {
    // 1. Retrieve relevant contexts
    const contexts = await vectorSearch(question, topK);
    
    // 2. Generate answer
    const { answer, tokensUsed } = await generateAnswer(
      question,
      contexts,
      targetLang
    );
    
    // 3. Extract citations
    const citations = contexts.map(ctx => ({
      title: ctx.title,
      quizId: ctx.quizId,
    }));
    
    return {
      answer,
      citations,
      usedChunks: contexts.length,
      processingTime: Date.now() - startTime,
      tokensUsed,
    };
    
  } catch (error) {
    console.error('RAG Error:', error);
    throw error;
  }
}

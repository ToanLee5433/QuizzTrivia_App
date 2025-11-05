/**
 * 🤖 RAG Flow - Retrieval-Augmented Generation
 * 
 * Main flow for question answering with context retrieval
 * Steps:
 * 1. Embed user question
 * 2. Find similar chunks (vector similarity)
 * 3. Filter by user permissions
 * 4. Build prompt with context
 * 5. Call Gemini for answer
 * 6. Extract citations
 * 
 * Performance target: < 2.5s (p95 latency)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RAGRequest, RAGResponse, Citation, ChunkMetadata, IndexedChunk } from './types';
import { generateEmbedding, cosineSimilarity } from './embeddings';
import { loadIndexFromFile } from './indexing';
import { filterChunksByPermission, getLockedQuizIds } from './permissions';
import { GENKIT_CONFIG } from './config';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(GENKIT_CONFIG.apiKey);

/**
 * Find top K most similar chunks to query
 */
function findTopKSimilarChunks(
  queryEmbedding: number[],
  chunks: IndexedChunk[],
  topK: number = 4,
  minSimilarity: number = 0.6
): Array<{ chunk: IndexedChunk; similarity: number }> {
  // Calculate similarity for each chunk
  const similarities = chunks.map(chunk => ({
    chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  // Filter by minimum similarity and sort descending
  const filtered = similarities
    .filter(item => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity);

  // Return top K
  return filtered.slice(0, topK);
}

/**
 * Build RAG prompt with context chunks
 */
function buildRAGPrompt(
  question: string,
  chunks: ChunkMetadata[],
  targetLang: string = 'vi'
): string {
  // Format context with numbered references
  const context = chunks
    .map((chunk, i) => {
      const citation = `[${i + 1}]`;
      return `${citation} ${chunk.title}\n${chunk.text}\n`;
    })
    .join('\n---\n\n');

  if (targetLang === 'vi') {
    return `Bạn là trợ lý học tập AI thông minh. Nhiệm vụ của bạn là trả lời câu hỏi dựa HOÀN TOÀN vào ngữ cảnh được cung cấp bên dưới.

NGUYÊN TẮC QUAN TRỌNG:
1. CHỈ sử dụng thông tin có trong ngữ cảnh bên dưới
2. Nếu không tìm thấy thông tin phù hợp trong ngữ cảnh → Trả lời: "Tôi không có đủ dữ liệu trong tài liệu hiện tại để trả lời câu hỏi này. Vui lòng thử câu hỏi khác hoặc mở khóa thêm quiz để có thêm nội dung."
3. LUÔN LUÔN trích dẫn nguồn bằng cách thêm [số] sau mỗi thông tin bạn sử dụng
4. Trả lời rõ ràng, súc tích, dễ hiểu
5. Nếu có nhiều khía cạnh, hãy trình bày theo điểm

NGỮ CẢNH (các tài liệu tham khảo):
${context}

CÂU HỎI: ${question}

TRẢ LỜI (nhớ kèm trích dẫn [số] sau mỗi thông tin):`;
  }

  // English version
  return `You are an intelligent AI learning assistant. Your task is to answer questions based ENTIRELY on the provided context below.

IMPORTANT RULES:
1. Use ONLY information from the context below
2. If you cannot find relevant information in the context → Answer: "I don't have enough data in the current documents to answer this question. Please try another question or unlock more quizzes for additional content."
3. ALWAYS cite sources by adding [number] after each fact you use
4. Answer clearly, concisely, and understandably
5. If there are multiple aspects, present them as bullet points

CONTEXT (reference documents):
${context}

QUESTION: ${question}

ANSWER (remember to include citations [number] after each fact):`;
}

/**
 * Extract citations from AI response
 */
function extractCitations(
  responseText: string,
  chunks: ChunkMetadata[]
): Citation[] {
  const citations: Citation[] = [];
  const citationRegex = /\[(\d+)\]/g;
  const usedIndices = new Set<number>();

  let match;
  while ((match = citationRegex.exec(responseText)) !== null) {
    const index = parseInt(match[1], 10) - 1;
    
    // Avoid duplicate citations
    if (index >= 0 && index < chunks.length && !usedIndices.has(index)) {
      usedIndices.add(index);
      const chunk = chunks[index];
      
      citations.push({
        title: chunk.title,
        quizId: chunk.quizId,
        snippet: chunk.text.substring(0, 200) + (chunk.text.length > 200 ? '...' : ''),
      });
    }
  }

  return citations;
}

/**
 * Main RAG flow: Answer question with retrieval-augmented generation
 */
export async function askQuestion(
  request: RAGRequest
): Promise<RAGResponse> {
  const startTime = Date.now();

  try {
    console.log(`🤔 Processing question: "${request.question.substring(0, 50)}..."`);

    // 1. Embed question
    console.log('🧠 Generating question embedding...');
    const queryEmbedding = await generateEmbedding(request.question);

    // 2. Load index and find similar chunks
    console.log('📚 Loading vector index...');
    const index = await loadIndexFromFile();
    
    const topK = request.topK || GENKIT_CONFIG.rag.topK;
    const similarityThreshold = GENKIT_CONFIG.rag.similarityThreshold;
    
    console.log(`🔍 Finding top ${topK} similar chunks (threshold: ${similarityThreshold})...`);
    const similarChunks = findTopKSimilarChunks(
      queryEmbedding,
      index.chunks,
      topK * 2, // Get more initially, will filter by permission
      similarityThreshold
    );

    if (similarChunks.length === 0) {
      console.log('⚠️ No similar chunks found');
      return {
        answer: request.targetLang === 'vi'
          ? 'Tôi không tìm thấy thông tin liên quan trong tài liệu hiện tại để trả lời câu hỏi này.'
          : 'I could not find relevant information in the current documents to answer this question.',
        citations: [],
        usedChunks: 0,
        processingTime: Date.now() - startTime,
      };
    }

    console.log(`✓ Found ${similarChunks.length} similar chunks (before permission filter)`);

    // 3. Filter by permission
    console.log('🔒 Filtering by user permissions...');
    const allowedChunks = await filterChunksByPermission(
      request.userId,
      similarChunks.map(s => s.chunk)
    );

    // Take only top K after permission filtering
    const finalChunks = allowedChunks.slice(0, topK);

    if (finalChunks.length === 0) {
      console.log('⚠️ No accessible chunks after permission filter');
      
      // Get locked quiz IDs to show in response
      const lockedQuizIds = await getLockedQuizIds(
        request.userId,
        similarChunks.map(s => s.chunk)
      );

      return {
        answer: request.targetLang === 'vi'
          ? `Tôi tìm thấy thông tin liên quan nhưng nội dung này thuộc các quiz đã khóa. Vui lòng nhập mật khẩu để mở khóa quiz và truy cập nội dung.${lockedQuizIds.length > 0 ? ` (Quiz IDs: ${lockedQuizIds.join(', ')})` : ''}`
          : `I found relevant information but this content belongs to locked quizzes. Please enter the password to unlock the quiz and access the content.${lockedQuizIds.length > 0 ? ` (Quiz IDs: ${lockedQuizIds.join(', ')})` : ''}`,
        citations: [],
        usedChunks: 0,
        processingTime: Date.now() - startTime,
      };
    }

    console.log(`✓ ${finalChunks.length} chunks accessible after permission check`);

    // 4. Build prompt with context
    const prompt = buildRAGPrompt(
      request.question,
      finalChunks,
      request.targetLang || 'vi'
    );

    // 5. Call Gemini for answer generation
    console.log('🚀 Calling Gemini API...');
    const model = genAI.getGenerativeModel({ 
      model: GENKIT_CONFIG.chatModel,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: GENKIT_CONFIG.generation.temperature,
        topK: GENKIT_CONFIG.generation.topK,
        topP: GENKIT_CONFIG.generation.topP,
        maxOutputTokens: GENKIT_CONFIG.generation.maxOutputTokens,
      },
    });

    const response = await result.response;
    const answerText = response.text();

    // 6. Extract citations
    console.log('📎 Extracting citations...');
    const citations = extractCitations(answerText, finalChunks);

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Question answered in ${processingTime}ms`);
    console.log(`   - Used ${finalChunks.length} chunks`);
    console.log(`   - Extracted ${citations.length} citations`);

    // 7. Return response
    return {
      answer: answerText,
      citations,
      usedChunks: finalChunks.length,
      processingTime,
      tokensUsed: {
        input: response.usageMetadata?.promptTokenCount || 0,
        output: response.usageMetadata?.candidatesTokenCount || 0,
      },
    };

  } catch (error) {
    console.error('❌ RAG flow error:', error);
    
    // Return user-friendly error
    return {
      answer: request.targetLang === 'vi'
        ? 'Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.'
        : 'Sorry, an error occurred while processing your question. Please try again later.',
      citations: [],
      usedChunks: 0,
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Batch process multiple questions (for testing)
 */
export async function askQuestions(
  userId: string,
  questions: string[],
  targetLang: 'vi' | 'en' = 'vi'
): Promise<RAGResponse[]> {
  const responses: RAGResponse[] = [];

  for (const question of questions) {
    const response = await askQuestion({
      userId,
      question,
      targetLang,
    });
    responses.push(response);
  }

  return responses;
}

/**
 * 🔍 Hybrid Search Utilities (v2.0 - Production Ready)
 * 
 * Combines:
 * - AI Query Rewriting (thay thế từ điển thủ công)
 * - Vector Search (semantic)
 * - Keyword Search (exact match)
 * - AI Re-ranking (optional)
 * - Relevance Thresholds
 */

import { GenerativeModel } from '@google/generative-ai';

// ============================================================
// 1️⃣ AI QUERY REWRITING (Thay thế từ điển đồng nghĩa thủ công)
// ============================================================

/**
 * AI Query Rewriting - Dùng LLM expand query thông minh
 * Thay thế hoàn toàn từ điển SYNONYMS thủ công
 */
export async function rewriteQueryWithAI(
  originalQuery: string,
  model: GenerativeModel
): Promise<string[]> {
  const prompt = `Bạn là AI chuyên xử lý truy vấn tìm kiếm quiz/bài học.

NHIỆM VỤ: Viết lại câu hỏi thành 3-4 biến thể khác nhau để tìm kiếm tốt hơn.

QUY TẮC:
1. Giữ nguyên ý nghĩa gốc
2. Mở rộng viết tắt (JS→JavaScript, AI→Artificial Intelligence, DB→Database)
3. Thêm từ đồng nghĩa tiếng Việt/Anh
4. Đơn giản hóa câu hỏi phức tạp
5. KHÔNG thêm thông tin mới, chỉ paraphrase

VÍ DỤ:
- "quiz JS" → ["quiz JavaScript", "bài trắc nghiệm JavaScript"]
- "học AI cơ bản" → ["học Artificial Intelligence cơ bản", "machine learning cho người mới"]

CÂU HỎI GỐC: "${originalQuery}"

TRẢ VỀ JSON ARRAY (chỉ JSON, không giải thích):
["query1", "query2", "query3"]`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3, // Low temperature for consistent output
        maxOutputTokens: 200,
      },
    });
    
    const text = result.response.text();
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
    const queries = JSON.parse(cleanJson);
    
    // Combine original + rewritten, remove duplicates
    const allQueries = [originalQuery, ...queries];
    return [...new Set(allQueries)];
  } catch (error) {
    console.warn('⚠️ AI Query Rewriting failed, using original:', error);
    return [originalQuery]; // Fallback to original
  }
}

// ============================================================
// 2️⃣ AI RE-RANKING (Cross-encoder style)
// ============================================================

/**
 * AI Re-ranking - LLM đánh giá relevance chính xác hơn vector search
 */
export async function aiRerank<T extends { text: string; title: string }>(
  query: string,
  candidates: T[],
  model: GenerativeModel,
  topK: number = 4
): Promise<Array<T & { rerankScore: number; rerankReason?: string }>> {
  if (candidates.length <= topK) {
    return candidates.map(c => ({ ...c, rerankScore: 1 }));
  }

  // Format candidates (truncate text to save tokens)
  const candidateList = candidates
    .slice(0, 15) // Max 15 to avoid token limit
    .map((c, i) => `[${i}] ${c.title}: ${c.text.substring(0, 150)}...`)
    .join('\n\n');

  const prompt = `Bạn là AI đánh giá độ liên quan của kết quả tìm kiếm quiz.

CÂU HỎI TÌM KIẾM: "${query}"

CÁC KẾT QUẢ:
${candidateList}

NHIỆM VỤ: Chọn ${topK} kết quả PHÙ HỢP NHẤT với câu hỏi.

TIÊU CHÍ ĐÁNH GIÁ:
- Trực tiếp trả lời/liên quan đến câu hỏi (score 0.9-1.0)
- Liên quan một phần (score 0.7-0.89)
- Ít liên quan (score 0.5-0.69)
- Không liên quan (score < 0.5, không chọn)

TRẢ VỀ JSON (chỉ JSON):
{"rankings": [{"index": 0, "score": 0.95}, {"index": 3, "score": 0.80}]}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Very low for consistent ranking
        maxOutputTokens: 300,
      },
    });

    const text = result.response.text();
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return parsed.rankings
      .slice(0, topK)
      .map((r: { index: number; score: number }) => ({
        ...candidates[r.index],
        rerankScore: r.score,
      }));
  } catch (error) {
    console.warn('⚠️ AI Re-ranking failed, using original order:', error);
    return candidates.slice(0, topK).map(c => ({ ...c, rerankScore: 0.5 }));
  }
}

// ============================================================
// 3️⃣ KEYWORD SEARCH UTILITIES
// ============================================================

/**
 * Vietnamese Stop Words (không quan trọng cho search)
 */
const STOP_WORDS_VI = new Set([
  'và', 'hoặc', 'nhưng', 'vì', 'nên', 'mà', 'thì', 'là', 'của', 'cho',
  'với', 'trong', 'ngoài', 'trên', 'dưới', 'này', 'kia', 'đó', 'ấy',
  'các', 'những', 'một', 'có', 'không', 'được', 'bị', 'sẽ', 'đã', 'đang',
  'rất', 'lắm', 'quá', 'hơn', 'nhất', 'ai', 'gì', 'nào', 'đâu', 'sao',
  'tôi', 'bạn', 'anh', 'chị', 'em', 'họ', 'nó', 'chúng',
]);

/**
 * English Stop Words
 */
const STOP_WORDS_EN = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
  'at', 'by', 'for', 'with', 'about', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'here', 'there', 'where',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
  'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does',
]);

const STOP_WORDS = new Set([...STOP_WORDS_VI, ...STOP_WORDS_EN]);

/**
 * Remove Vietnamese diacritics for matching
 */
export function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Extract meaningful keywords from text
 */
export function extractKeywords(text: string): string[] {
  const normalized = text.toLowerCase();
  
  // Split and filter
  const words = normalized
    .split(/[\s\-_.,;:!?()[\]{}'"\/\\]+/)
    .filter(w => w.length >= 2)
    .filter(w => !STOP_WORDS.has(w));
  
  return [...new Set(words)];
}

/**
 * Keyword search in chunks (fast exact match)
 */
export function keywordSearch<T extends { chunkId: string; text: string; title: string }>(
  chunks: T[],
  keywords: string[],
  topK: number = 10
): Array<T & { score: number; matchedKeywords: string[] }> {
  const results: Array<{ chunk: T; score: number; matchedKeywords: string[] }> = [];
  
  for (const chunk of chunks) {
    const textLower = chunk.text.toLowerCase();
    const titleLower = chunk.title.toLowerCase();
    const combined = `${titleLower} ${textLower}`;
    const combinedNoDiacritics = removeVietnameseDiacritics(combined);
    
    let score = 0;
    const matchedKeywords: string[] = [];
    
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const keywordNoDiacritics = removeVietnameseDiacritics(keywordLower);
      
      // Title match (high weight)
      if (titleLower.includes(keywordLower)) {
        score += 3;
        matchedKeywords.push(keyword);
      }
      // Text match
      else if (textLower.includes(keywordLower)) {
        score += 1;
        matchedKeywords.push(keyword);
      }
      // Match without diacritics
      else if (combinedNoDiacritics.includes(keywordNoDiacritics)) {
        score += 0.5;
        matchedKeywords.push(keyword);
      }
    }
    
    if (score > 0) {
      results.push({ chunk, score, matchedKeywords: [...new Set(matchedKeywords)] });
    }
  }
  
  // Sort and return top K
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK).map(r => ({
    ...r.chunk,
    score: r.score,
    matchedKeywords: r.matchedKeywords,
  }));
}

// ============================================================
// 4️⃣ RECIPROCAL RANK FUSION (RRF)
// ============================================================

/**
 * Merge multiple result sets using RRF
 * Formula: score = Σ 1/(k + rank_i)
 */
export function reciprocalRankFusion<T extends { chunkId: string }>(
  resultSets: T[][],
  k: number = 60
): Array<T & { rrfScore: number }> {
  const rrfScores = new Map<string, { score: number; item: T }>();
  
  for (const results of resultSets) {
    results.forEach((item, rank) => {
      const rrfScore = 1 / (k + rank + 1);
      const existing = rrfScores.get(item.chunkId);
      
      if (existing) {
        existing.score += rrfScore;
      } else {
        rrfScores.set(item.chunkId, { score: rrfScore, item });
      }
    });
  }
  
  return Array.from(rrfScores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ score, item }) => ({ ...item, rrfScore: score }));
}

// ============================================================
// 5️⃣ RELEVANCE THRESHOLDS
// ============================================================

export const RELEVANCE_THRESHOLDS = {
  HIGH: 0.70,      // High confidence
  MEDIUM: 0.55,    // Medium confidence
  LOW: 0.40,       // Low confidence, show warning
  MINIMUM: 0.30,   // Below = reject
};

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

export interface SearchResultWithConfidence<T> {
  results: T[];
  confidence: ConfidenceLevel;
  warning?: string;
  fallback?: boolean;
}

/**
 * Categorize results by confidence level
 */
export function categorizeByConfidence<T extends { score: number }>(
  results: T[],
  topK: number = 4
): SearchResultWithConfidence<T> {
  const high = results.filter(r => r.score >= RELEVANCE_THRESHOLDS.HIGH);
  const medium = results.filter(r => 
    r.score >= RELEVANCE_THRESHOLDS.MEDIUM && r.score < RELEVANCE_THRESHOLDS.HIGH
  );
  const low = results.filter(r => 
    r.score >= RELEVANCE_THRESHOLDS.LOW && r.score < RELEVANCE_THRESHOLDS.MEDIUM
  );
  
  // High confidence
  if (high.length >= 2) {
    return { 
      results: high.slice(0, topK), 
      confidence: 'high' 
    };
  }
  
  // Medium confidence
  if (high.length + medium.length >= 2) {
    return { 
      results: [...high, ...medium].slice(0, topK), 
      confidence: 'medium' 
    };
  }
  
  // Low confidence
  if (low.length > 0) {
    return { 
      results: [...high, ...medium, ...low].slice(0, topK), 
      confidence: 'low',
      warning: 'Kết quả có thể không hoàn toàn chính xác. Hãy thử diễn đạt lại câu hỏi.'
    };
  }
  
  // No results
  return { 
    results: [], 
    confidence: 'none', 
    fallback: true 
  };
}

"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.categorizeByConfidence = exports.RELEVANCE_THRESHOLDS = exports.reciprocalRankFusion = exports.keywordSearch = exports.extractKeywords = exports.removeVietnameseDiacritics = exports.extractVietnameseKeywords = exports.preprocessVietnameseText = exports.generateVietnameseNgrams = exports.aiRerank = exports.rewriteQueryWithAI = void 0;
// ============================================================
// 🔧 CONSTANTS
// ============================================================
// v4.3.1: Timeout for AI operations to prevent hanging
const AI_QUERY_REWRITE_TIMEOUT_MS = 5000; // 5 seconds
const AI_RERANK_TIMEOUT_MS = 10000; // 10 seconds
/**
 * Helper: Execute with timeout
 */
async function withTimeout(promise, timeoutMs, operationName) {
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });
    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutHandle);
        return result;
    }
    catch (error) {
        clearTimeout(timeoutHandle);
        throw error;
    }
}
// ============================================================
// 1️⃣ AI QUERY REWRITING (Thay thế từ điển đồng nghĩa thủ công)
// ============================================================
/**
 * AI Query Rewriting - Dùng LLM expand query thông minh
 * Thay thế hoàn toàn từ điển SYNONYMS thủ công
 * v4.3.1: Added timeout protection
 */
async function rewriteQueryWithAI(originalQuery, model) {
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
        // v4.3.1: Wrap AI call with timeout
        const result = await withTimeout(model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 200,
            },
        }), AI_QUERY_REWRITE_TIMEOUT_MS, 'AI Query Rewriting');
        const text = result.response.text();
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
        const queries = JSON.parse(cleanJson);
        // Combine original + rewritten, remove duplicates
        const allQueries = [originalQuery, ...queries];
        return [...new Set(allQueries)];
    }
    catch (error) {
        console.warn('⚠️ AI Query Rewriting failed, using original:', error);
        return [originalQuery]; // Fallback to original
    }
}
exports.rewriteQueryWithAI = rewriteQueryWithAI;
// ============================================================
// 2️⃣ AI RE-RANKING (Cross-encoder style)
// ============================================================
/**
 * AI Re-ranking - LLM đánh giá relevance chính xác hơn vector search
 * v4.3.1: Added timeout protection and index validation
 */
async function aiRerank(query, candidates, model, topK = 4) {
    if (candidates.length <= topK) {
        return candidates.map(c => (Object.assign(Object.assign({}, c), { rerankScore: 1 })));
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
        // v4.3.1: Wrap AI call with timeout
        const result = await withTimeout(model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 300,
            },
        }), AI_RERANK_TIMEOUT_MS, 'AI Re-ranking');
        const text = result.response.text();
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        // v4.3.1: Validate indices to prevent array out of bounds
        const validRankings = parsed.rankings
            .filter((r) => typeof r.index === 'number' &&
            r.index >= 0 &&
            r.index < candidates.length &&
            typeof r.score === 'number')
            .slice(0, topK);
        if (validRankings.length === 0) {
            console.warn('⚠️ AI Re-ranking returned no valid indices, using original order');
            return candidates.slice(0, topK).map(c => (Object.assign(Object.assign({}, c), { rerankScore: 0.5 })));
        }
        return validRankings.map((r) => (Object.assign(Object.assign({}, candidates[r.index]), { rerankScore: r.score })));
    }
    catch (error) {
        console.warn('⚠️ AI Re-ranking failed, using original order:', error);
        return candidates.slice(0, topK).map(c => (Object.assign(Object.assign({}, c), { rerankScore: 0.5 })));
    }
}
exports.aiRerank = aiRerank;
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
// ============================================================
// 🇻🇳 VIETNAMESE TOKENIZATION (v4.3 - Workaround for BM25)
// ============================================================
/**
 * Common Vietnamese compound words that should be kept together
 * This helps Orama BM25 search work better with Vietnamese
 *
 * v4.4 EXPANDED: Added many more common compounds for better coverage
 * Categories: Technology, Education, Subjects, General Vietnamese
 */
const VIETNAMESE_COMPOUNDS = new Map([
    // === TECHNOLOGY (Công nghệ) ===
    ['lập trình', 'laptrinh'],
    ['lập trình viên', 'laptrinh_vien'],
    ['cơ sở dữ liệu', 'cosodulieudata'],
    ['trí tuệ nhân tạo', 'trituenhantao_ai'],
    ['học máy', 'hocmay_ml'],
    ['học sâu', 'hocsau_deeplearning'],
    ['mạng nơ-ron', 'mangneuron_nn'],
    ['phần mềm', 'phanmem_software'],
    ['phần cứng', 'phancung_hardware'],
    ['ứng dụng', 'ungdung_app'],
    ['giao diện', 'giaodien_ui'],
    ['thuật toán', 'thuattoan_algorithm'],
    ['biến số', 'bienso_variable'],
    ['hàm số', 'hamso_function'],
    ['vòng lặp', 'vonglap_loop'],
    ['mảng', 'mang_array'],
    ['đối tượng', 'doituong_object'],
    ['kế thừa', 'kethua_inheritance'],
    ['đa hình', 'dahinh_polymorphism'],
    ['đóng gói', 'donggoi_encapsulation'],
    ['trừu tượng', 'truutuong_abstraction'],
    ['mã nguồn', 'manguon_sourcecode'],
    ['mã nguồn mở', 'manguonmo_opensource'],
    ['kiến trúc', 'kientruc_architecture'],
    ['thiết kế', 'thietke_design'],
    ['bảo mật', 'baomat_security'],
    ['xác thực', 'xacthuc_authentication'],
    ['phân quyền', 'phanquyen_authorization'],
    ['máy chủ', 'maychu_server'],
    ['người dùng', 'nguoidung_user'],
    ['trình duyệt', 'trinhduyet_browser'],
    ['khung công tác', 'khungcongtac_framework'],
    ['thư viện', 'thuvien_library'],
    // === EDUCATION (Giáo dục) ===
    ['kiểm tra', 'kiemtra_test'],
    ['bài tập', 'baitap_exercise'],
    ['câu hỏi', 'cauhoi_question'],
    ['đáp án', 'dapan_answer'],
    ['lộ trình', 'lotrinh_roadmap'],
    ['học tập', 'hoctap_learning'],
    ['ôn tập', 'ontap_review'],
    ['luyện tập', 'luyentap_practice'],
    ['bài kiểm tra', 'baikiemtra_quiz'],
    ['bài trắc nghiệm', 'baitracnghiem_multiplechoice'],
    ['trắc nghiệm', 'tracnghiem_quiz'],
    ['thi thử', 'thithu_mocktest'],
    ['điểm số', 'diemso_score'],
    ['kết quả', 'ketqua_result'],
    ['chứng chỉ', 'chungchi_certificate'],
    ['khóa học', 'khoahoc_course'],
    ['bài học', 'baihoc_lesson'],
    ['giảng viên', 'giangvien_instructor'],
    ['sinh viên', 'sinhvien_student'],
    ['học sinh', 'hocsinh_student'],
    // === SUBJECTS (Môn học) ===
    ['toán học', 'toanhoc_math'],
    ['vật lý', 'vatly_physics'],
    ['hóa học', 'hoahoc_chemistry'],
    ['sinh học', 'sinhhoc_biology'],
    ['lịch sử', 'lichsu_history'],
    ['địa lý', 'dialy_geography'],
    ['ngữ văn', 'nguvan_literature'],
    ['tiếng anh', 'tienganh_english'],
    ['tin học', 'tinhoc_it_informatics'],
    ['công nghệ', 'congnghe_technology'],
    ['kinh tế', 'kinhte_economics'],
    ['triết học', 'triethoc_philosophy'],
    ['tâm lý học', 'tamlyhoc_psychology'],
    // === GENERAL VIETNAMESE (Từ ghép thông dụng) ===
    ['như thế nào', 'nhutuknao_how'],
    ['tại sao', 'taisao_why'],
    ['là gì', 'lagi_what'],
    ['ở đâu', 'odau_where'],
    ['bao nhiêu', 'baonhieu_howmuch'],
    ['khi nào', 'khinao_when'],
    ['thế nào', 'thenao_how'],
    ['cách nào', 'cachnao_howto'],
]);
/**
 * 🇻🇳 Vietnamese n-gram generation for better BM25 matching (v4.4 Enhanced)
 *
 * Generates multiple n-gram types for robust Vietnamese search:
 * - Word unigrams (original words)
 * - Word bigrams (2 consecutive words - crucial for Vietnamese compound words)
 * - Word trigrams (3 consecutive words - for longer phrases)
 * - Character bi-grams (for typo tolerance)
 *
 * WHY: Vietnamese has many compound words ("lập trình", "cơ sở dữ liệu")
 * that need to be kept together for accurate BM25 scoring.
 */
function generateVietnameseNgrams(text, charN = 2) {
    const normalized = text.toLowerCase().trim();
    const ngrams = [];
    // 1. Word-level tokens (unigrams)
    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    ngrams.push(...words);
    // 2. 🆕 Word-level BIGRAMS (critical for Vietnamese compound words!)
    // "lập trình viên" → ["lập trình", "trình viên"]
    for (let i = 0; i < words.length - 1; i++) {
        ngrams.push(`${words[i]} ${words[i + 1]}`);
    }
    // 3. 🆕 Word-level TRIGRAMS (for longer phrases)
    // "cơ sở dữ liệu" → "cơ sở dữ", "sở dữ liệu"
    for (let i = 0; i < words.length - 2; i++) {
        ngrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
    // 4. Character n-grams for each word (helps with typos and partial matches)
    for (const word of words) {
        if (word.length >= charN) {
            for (let i = 0; i <= word.length - charN; i++) {
                ngrams.push(word.substring(i, i + charN));
            }
        }
        // Also add trigrams for longer words
        if (word.length >= 3) {
            for (let i = 0; i <= word.length - 3; i++) {
                ngrams.push(word.substring(i, i + 3));
            }
        }
    }
    return [...new Set(ngrams)];
}
exports.generateVietnameseNgrams = generateVietnameseNgrams;
/**
 * Preprocess Vietnamese text for better search
 * - Normalizes compound words
 * - Removes diacritics for fallback matching
 * - Generates n-grams for fuzzy matching
 */
function preprocessVietnameseText(text) {
    const lower = text.toLowerCase();
    // Replace compound words with joined versions
    let compounds = lower;
    for (const [compound, joined] of VIETNAMESE_COMPOUNDS) {
        compounds = compounds.replace(new RegExp(compound, 'gi'), joined);
    }
    return {
        original: text,
        normalized: lower,
        noDiacritics: removeVietnameseDiacritics(lower),
        compounds,
        ngrams: generateVietnameseNgrams(lower),
    };
}
exports.preprocessVietnameseText = preprocessVietnameseText;
/**
 * Enhanced Vietnamese keyword extraction
 * Uses compound word detection and n-grams
 */
function extractVietnameseKeywords(text) {
    const processed = preprocessVietnameseText(text);
    const keywords = [];
    // Extract regular keywords
    const basicKeywords = extractKeywords(processed.normalized);
    keywords.push(...basicKeywords);
    // Add compound word versions
    for (const [compound, joined] of VIETNAMESE_COMPOUNDS) {
        if (processed.normalized.includes(compound)) {
            keywords.push(joined);
        }
    }
    // Add no-diacritics versions for fallback
    for (const kw of basicKeywords) {
        const noDiac = removeVietnameseDiacritics(kw);
        if (noDiac !== kw) {
            keywords.push(noDiac);
        }
    }
    return [...new Set(keywords)];
}
exports.extractVietnameseKeywords = extractVietnameseKeywords;
/**
 * Remove Vietnamese diacritics for matching
 */
function removeVietnameseDiacritics(str) {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}
exports.removeVietnameseDiacritics = removeVietnameseDiacritics;
/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text) {
    const normalized = text.toLowerCase();
    // Split and filter
    const words = normalized
        .split(/[\s\-_.,;:!?()[\]{}'"\/\\]+/)
        .filter(w => w.length >= 2)
        .filter(w => !STOP_WORDS.has(w));
    return [...new Set(words)];
}
exports.extractKeywords = extractKeywords;
/**
 * Keyword search in chunks (fast exact match)
 */
function keywordSearch(chunks, keywords, topK = 10) {
    const results = [];
    for (const chunk of chunks) {
        const textLower = chunk.text.toLowerCase();
        const titleLower = chunk.title.toLowerCase();
        const combined = `${titleLower} ${textLower}`;
        const combinedNoDiacritics = removeVietnameseDiacritics(combined);
        let score = 0;
        const matchedKeywords = [];
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
    return results.slice(0, topK).map(r => (Object.assign(Object.assign({}, r.chunk), { score: r.score, matchedKeywords: r.matchedKeywords })));
}
exports.keywordSearch = keywordSearch;
// ============================================================
// 4️⃣ RECIPROCAL RANK FUSION (RRF)
// ============================================================
/**
 * Merge multiple result sets using RRF
 * Formula: score = Σ 1/(k + rank_i)
 */
function reciprocalRankFusion(resultSets, k = 60) {
    const rrfScores = new Map();
    for (const results of resultSets) {
        results.forEach((item, rank) => {
            const rrfScore = 1 / (k + rank + 1);
            const existing = rrfScores.get(item.chunkId);
            if (existing) {
                existing.score += rrfScore;
            }
            else {
                rrfScores.set(item.chunkId, { score: rrfScore, item });
            }
        });
    }
    return Array.from(rrfScores.values())
        .sort((a, b) => b.score - a.score)
        .map(({ score, item }) => (Object.assign(Object.assign({}, item), { rrfScore: score })));
}
exports.reciprocalRankFusion = reciprocalRankFusion;
// ============================================================
// 5️⃣ RELEVANCE THRESHOLDS
// ============================================================
exports.RELEVANCE_THRESHOLDS = {
    HIGH: 0.70,
    MEDIUM: 0.55,
    LOW: 0.40,
    MINIMUM: 0.30, // Below = reject
};
/**
 * Categorize results by confidence level
 */
function categorizeByConfidence(results, topK = 4) {
    const high = results.filter(r => r.score >= exports.RELEVANCE_THRESHOLDS.HIGH);
    const medium = results.filter(r => r.score >= exports.RELEVANCE_THRESHOLDS.MEDIUM && r.score < exports.RELEVANCE_THRESHOLDS.HIGH);
    const low = results.filter(r => r.score >= exports.RELEVANCE_THRESHOLDS.LOW && r.score < exports.RELEVANCE_THRESHOLDS.MEDIUM);
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
exports.categorizeByConfidence = categorizeByConfidence;
//# sourceMappingURL=hybridSearch.js.map
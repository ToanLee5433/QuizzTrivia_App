"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteQuiz = exports.reopenQuiz = exports.rejectQuiz = exports.approveQuiz = exports.generateQuestions = exports.testAI = exports.sayHello = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const generative_ai_1 = require("@google/generative-ai");
// Initialize Firebase Admin
admin.initializeApp();
// Initialize Google Generative AI with API key
const genAI = new generative_ai_1.GoogleGenerativeAI("AIzaSyBSA4zCEsVUROJVJPAElcQ1I1cfii4bFqw");
/**
 * Simple test function for emulator
 */
exports.sayHello = functions.https.onCall((data, context) => {
    const name = data.name || 'Stranger';
    console.log(`sayHello function called with name: ${name}`);
    return {
        message: `Hello, ${name} from Firebase Functions Emulator!`,
        timestamp: new Date().toISOString(),
        emulator: true
    };
});
/**
 * Test function để kiểm tra kết nối AI
 */
exports.testAI = functions.https.onCall(async (data, context) => {
    // Không cần auth cho test function
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Chào bạn! Hãy trả lời ngắn gọn bằng tiếng Việt.");
        const response = await result.response;
        const text = response.text();
        return {
            success: true,
            message: "AI connection successful!",
            response: text,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('AI Test Error:', error);
        return {
            success: false,
            message: "AI connection failed",
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        };
    }
});
/**
 * Firebase Function để generate câu hỏi sử dụng Google Generative AI
 */
exports.generateQuestions = functions.https.onCall(async (data, context) => {
    // Kiểm tra authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Phải đăng nhập để sử dụng tính năng này');
    }
    const { topic, difficulty, numQuestions } = data;
    if (!topic || !difficulty || !numQuestions) {
        throw new functions.https.HttpsError('invalid-argument', 'Thiếu thông tin: topic, difficulty, hoặc numQuestions');
    }
    try {
        // Lấy model Gemini Pro
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        // Tạo prompt để generate câu hỏi
        const prompt = `
Tạo ${numQuestions} câu hỏi trắc nghiệm về chủ đề "${topic}" với độ khó ${difficulty}.

Yêu cầu định dạng JSON:
{
  "questions": [
    {
      "text": "Câu hỏi...",
      "answers": [
        {"text": "Đáp án A", "isCorrect": false},
        {"text": "Đáp án B", "isCorrect": true},
        {"text": "Đáp án C", "isCorrect": false},
        {"text": "Đáp án D", "isCorrect": false}
      ]
    }
  ]
}

Lưu ý:
- Mỗi câu hỏi phải có đúng 4 đáp án
- Chỉ có 1 đáp án đúng
- Câu hỏi phải phù hợp với độ khó ${difficulty}
- Sử dụng tiếng Việt
- Trả về chỉ JSON, không có text thêm
`;
        console.log('🤖 Generating questions with prompt:', prompt);
        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log('📝 AI Response:', text);
        // Parse JSON response
        let questionsData;
        try {
            // Loại bỏ markdown formatting nếu có
            const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            questionsData = JSON.parse(cleanText);
        }
        catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
            throw new functions.https.HttpsError('internal', 'Không thể parse response từ AI');
        }
        // Validate response format
        if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
            throw new functions.https.HttpsError('internal', 'Format response từ AI không đúng');
        }
        // Validate each question
        for (const question of questionsData.questions) {
            if (!question.text || !question.answers || question.answers.length !== 4) {
                throw new functions.https.HttpsError('internal', 'Câu hỏi không đúng format (phải có text và 4 answers)');
            }
            const correctAnswers = question.answers.filter((a) => a.isCorrect);
            if (correctAnswers.length !== 1) {
                throw new functions.https.HttpsError('internal', 'Mỗi câu hỏi phải có đúng 1 đáp án đúng');
            }
        }
        console.log('✅ Generated questions successfully:', questionsData.questions.length);
        return {
            success: true,
            questions: questionsData.questions,
            metadata: {
                topic,
                difficulty,
                numQuestions: questionsData.questions.length,
                generatedAt: new Date().toISOString()
            }
        };
    }
    catch (error) {
        console.error('❌ Error generating questions:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Có lỗi xảy ra khi tạo câu hỏi: ' + error.message);
    }
});
// Admin functions (existing code từ trước)
const ensureIsAdmin = async (uid) => {
    var _a;
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "User must be an admin to perform this action.");
    }
};
exports.approveQuiz = functions.https.onCall(async (data, context) => {
    var _a;
    const quizId = data.quizId;
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    await ensureIsAdmin(uid);
    const quizRef = admin.firestore().collection("quizzes").doc(quizId);
    await quizRef.update({
        status: "approved",
        isPublished: true,
        approvedAt: new Date(),
        approvedBy: uid,
    });
    return { message: "Quiz approved successfully" };
});
exports.rejectQuiz = functions.https.onCall(async (data, context) => {
    var _a;
    const quizId = data.quizId;
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    await ensureIsAdmin(uid);
    const quizRef = admin.firestore().collection("quizzes").doc(quizId);
    await quizRef.update({
        status: "rejected",
        isPublished: false,
        rejectedAt: new Date(),
        rejectedBy: uid,
    });
    return { message: "Quiz rejected successfully" };
});
exports.reopenQuiz = functions.https.onCall(async (data, context) => {
    var _a;
    const quizId = data.quizId;
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    await ensureIsAdmin(uid);
    const quizRef = admin.firestore().collection("quizzes").doc(quizId);
    await quizRef.update({
        status: "pending",
        isPublished: false,
        reopenedAt: new Date(),
        reopenedBy: uid,
    });
    return { message: "Quiz reopened successfully" };
});
exports.deleteQuiz = functions.https.onCall(async (data, context) => {
    var _a;
    const quizId = data.quizId;
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    await ensureIsAdmin(uid);
    const quizRef = admin.firestore().collection("quizzes").doc(quizId);
    await quizRef.delete();
    return { message: "Quiz deleted successfully" };
});
//# sourceMappingURL=index.js.map
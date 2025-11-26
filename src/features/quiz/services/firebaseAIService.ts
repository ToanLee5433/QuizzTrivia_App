// Firebase AI Service using Google Generative AI (Gemini)
// Service để tạo câu hỏi tự động bằng AI
// Updated: 2025-11 - Using gemini-2.5-flash-lite (RPM: 4000, TPM: 4M)

import { Question, QuestionType } from '../types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

export interface FirebaseAIConfig {
  model?: 'gemini-2.5-flash-lite'; // Only use gemini-2.5-flash-lite
  temperature?: number;
  maxTokens?: number;
}

export interface QuestionGenerationOptions {
  content: string;
  customPrompt?: string;
  numQuestions?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  language?: 'vi' | 'en';
  questionTypes?: QuestionType[];
}

/**
 * Firebase AI Service using Google Generative AI (Gemini)
 */
export class FirebaseAIService {
  private static functions = getFunctions();
  
  static async generateQuestions(
    config: FirebaseAIConfig = {},
    options: QuestionGenerationOptions
  ): Promise<Question[]> {
    const { 
      content, 
      customPrompt, 
      numQuestions = 5, 
      difficulty = 'mixed', 
      language = 'vi',
      questionTypes
    } = options;

    // Kiểm tra xác thực
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('Vui lòng đăng nhập để sử dụng tính năng AI');
    }

    try {
      // Tạo system prompt
      const systemPrompt = customPrompt || this.getDefaultPrompt(numQuestions, difficulty, language, questionTypes);
      
      console.log('🚀 Calling Firebase Function generateQuestions...');
      console.log('📤 Request:', {
        promptLength: systemPrompt.length,
        contentLength: content.length,
        numQuestions,
        difficulty,
        language,
        model: config.model || 'gemini-2.5-flash-lite'
      });

      // Gọi Firebase Function
      const generateQuestions = httpsCallable(this.functions, 'generateQuestions');
      
      const result = await generateQuestions({
        prompt: systemPrompt,
        content: content,
        config: {
          model: config.model || 'gemini-2.5-flash-lite',
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 16000 // ⚡ gemini-2.5-flash-lite supports high token limits
        }
      });

      const data = result.data as any;
      
      console.log('📥 Firebase Function response:', data);

      if (!data || typeof data !== 'object') {
        console.error('❌ Invalid response type:', typeof data);
        throw new Error('Firebase Function trả về response không hợp lệ');
      }

      if (!data.success) {
        const errorMsg = data.error || 'AI generation failed';
        console.error('❌ Firebase Function returned error:', errorMsg);
        
        // Show detailed error to help debugging
        throw new Error(errorMsg);
      }

      if (!data.questions) {
        console.error('❌ No questions in response:', data);
        throw new Error('Firebase Function không trả về questions array');
      }

      return this.parseQuestionsFromResponse(data.questions);
    } catch (error) {
      console.error('❌ Firebase AI Service Error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw new Error(`Không thể tạo câu hỏi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Tạo prompt mặc định cho việc generate câu hỏi
   */
  private static getDefaultPrompt(
    numQuestions: number, 
    difficulty: string, 
    language: string,
    questionTypes?: QuestionType[]
  ): string {
    const lang = language === 'vi' ? 'tiếng Việt' : 'English';
    
    // Map question types
    const typeMap: Record<QuestionType, string> = {
      'multiple': 'trắc nghiệm (4 đáp án, chọn 1)',
      'boolean': 'đúng/sai (2 đáp án)',
      'short_answer': 'trả lời ngắn/điền từ (nhập text)',
      'checkbox': 'chọn nhiều đáp án (có thể chọn nhiều đáp án đúng)',
      'ordering': 'sắp xếp thứ tự',
      'matching': 'ghép cặp',
      'fill_blanks': 'điền vào chỗ trống/viết văn',
      'image': 'chọn ảnh',
      'audio': 'nghe audio',
      'video': 'xem video',
      'multimedia': 'đa phương tiện (câu hỏi và đáp án có thể có image/audio/video)',
      'rich_content': 'nội dung phong phú'
    };
    
    // Build strict type restrictions
    const allowedTypes: QuestionType[] = questionTypes && questionTypes.length > 0 ? questionTypes : ['multiple'];
    const allowedTypesStr = allowedTypes.map(t => `"${t}"`).join(', ');
    const allowedTypesDescription = allowedTypes.map(t => `${t} (${typeMap[t] || t})`).join(', ');
    
    // Calculate distribution
    const questionsPerType = Math.floor(numQuestions / allowedTypes.length);
    const remainder = numQuestions % allowedTypes.length;
    const distributionStr = allowedTypes.map((t, i) => 
      `${t}: ${questionsPerType + (i < remainder ? 1 : 0)} câu`
    ).join(', ');

    const typesDescription = `
QUAN TRỌNG - CHỈ TẠO CÁC LOẠI CÂU HỎI SAU (KHÔNG TẠO LOẠI KHÁC):
- Các loại được phép: ${allowedTypesDescription}
- Phân bố: ${distributionStr}
- CẢNH BÁO: Chỉ sử dụng type: ${allowedTypesStr}. Nếu type không nằm trong danh sách này, câu hỏi sẽ bị từ chối.
${allowedTypes.includes('checkbox') ? '- Đối với checkbox: có thể có nhiều đáp án isCorrect: true' : ''}
${allowedTypes.includes('ordering') ? '- Đối với ordering: trả về orderingItems với correctOrder' : ''}
${allowedTypes.includes('matching') ? '- Đối với matching: trả về matchingPairs với left và right' : ''}
${allowedTypes.includes('fill_blanks') ? '- Đối với fill_blanks: trả về textWithBlanks và blanks' : ''}
${allowedTypes.includes('short_answer') ? '- Đối với short_answer: trả về correctAnswer và acceptedAnswers' : ''}`;
    
    // Map difficulty to description
    const difficultyMap: Record<string, string> = {
      'easy': 'dễ (kiến thức cơ bản, ai cũng biết)',
      'medium': 'trung bình (cần suy nghĩ một chút)',
      'hard': 'khó (đòi hỏi kiến thức chuyên sâu)',
      'mixed': 'hỗn hợp (phân bố đều: 1/3 dễ, 1/3 trung bình, 1/3 khó)'
    };
    const difficultyDesc = difficultyMap[difficulty] || difficulty;

    return `Generate ${numQuestions} quiz questions in ${lang} for the following topic.

STRICT REQUIREMENTS (BẮT BUỘC):
1. Language: ALL questions and answers MUST be in ${lang}. Do NOT mix languages.
2. Difficulty: ${difficultyDesc}
${difficulty === 'mixed' ? '   - Đánh dấu từng câu hỏi với độ khó tương ứng trong field "difficulty": "easy" | "medium" | "hard"' : `   - TẤT CẢ câu hỏi phải có độ khó: ${difficulty}`}
3. Format: Return ONLY valid JSON array, no markdown, no code blocks
${typesDescription}

Structure requirements:
1. ALL questions MUST have "type" field
2. Multiple choice (type: "multiple"): 4 answers, exactly one isCorrect: true
3. Boolean (type: "boolean"): 2 answers (Đúng/Sai or True/False), one isCorrect: true
4. Checkbox (type: "checkbox"): 4+ answers, CAN have MULTIPLE isCorrect: true
5. Short answer (type: "short_answer"): correctAnswer string, acceptedAnswers array
6. Ordering (type: "ordering"): orderingItems with correctOrder array
7. Matching (type: "matching"): matchingPairs with left/right arrays

Example formats:
[
  {
    "type": "multiple",
    "question": "Thủ đô của Việt Nam là gì?",
    "answers": [
      {"text": "Hà Nội", "isCorrect": true},
      {"text": "TP HCM", "isCorrect": false},
      {"text": "Đà Nẵng", "isCorrect": false},
      {"text": "Huế", "isCorrect": false}
    ],
    "explanation": "Hà Nội là thủ đô của Việt Nam"
  },
  {
    "type": "boolean",
    "question": "Trái đất quay quanh mặt trời?",
    "answers": [
      {"text": "Đúng", "isCorrect": true},
      {"text": "Sai", "isCorrect": false}
    ],
    "explanation": "Trái đất quay quanh mặt trời trong 365 ngày"
  },
  {
    "type": "checkbox",
    "question": "Những thành phố nào là trực thuộc trung ương?",
    "answers": [
      {"text": "Hà Nội", "isCorrect": true},
      {"text": "TP HCM", "isCorrect": true},
      {"text": "Đà Nẵng", "isCorrect": true},
      {"text": "Nha Trang", "isCorrect": false}
    ],
    "explanation": "Có 5 thành phố trực thuộc trung ương"
  },
  {
    "type": "short_answer",
    "question": "Ai là tác giả của Truyện Kiều?",
    "correctAnswer": "Nguyễn Du",
    "acceptedAnswers": ["Nguyễn Du", "nguyen du"],
    "explanation": "Nguyễn Du là tác giả của Truyện Kiều"
  },
  {
    "type": "ordering",
    "question": "Sắp xếp các số từ nhỏ đến lớn:",
    "orderingItems": ["5", "2", "9", "1"],
    "correctOrder": [3, 1, 0, 2],
    "explanation": "Thứ tự đúng: 1, 2, 5, 9"
  },
  {
    "type": "matching",
    "question": "Ghép thủ đô với quốc gia:",
    "matchingPairs": {
      "left": ["Hà Nội", "Bangkok", "Tokyo"],
      "right": ["Nhật Bản", "Việt Nam", "Thái Lan"],
      "correctPairs": [[0, 1], [1, 2], [2, 0]]
    },
    "explanation": "Ghép đúng thủ đô với quốc gia"
  }
]`;
  }

  /**
   * Convert AI blanks format to UI format
   */
  private static convertBlanks(aiBlanks: any): any {
    if (!aiBlanks) return undefined;
    
    // If already has id field, return as-is
    if (Array.isArray(aiBlanks) && aiBlanks.length > 0 && aiBlanks[0].id) {
      return aiBlanks;
    }
    
    // Convert from AI format to UI format with id field
    if (Array.isArray(aiBlanks)) {
      return aiBlanks.map((blank, idx) => ({
        id: blank.id || `blank_${idx + 1}`,
        position: blank.position !== undefined ? blank.position : idx,
        correctAnswer: blank.correctAnswer || '',
        acceptedAnswers: blank.acceptedAnswers || [],
        caseSensitive: blank.caseSensitive || false
      }));
    }
    
    return undefined;
  }

  /**
   * Convert AI orderingItems format to UI format
   */
  private static convertOrderingItems(aiItems: any): any {
    if (!aiItems) return undefined;
    
    // If already has id field, return as-is
    if (Array.isArray(aiItems) && aiItems.length > 0 && aiItems[0].id) {
      return aiItems;
    }
    
    // Convert from AI format: ["item1", "item2"] or [correctOrder indices]
    // to UI format: [{id, text, correctOrder}]
    if (Array.isArray(aiItems)) {
      return aiItems.map((item, idx) => ({
        id: `order_${idx + 1}`,
        text: typeof item === 'string' ? item : item.text || '',
        correctOrder: idx + 1,
        imageUrl: item.imageUrl
      }));
    }
    
    return undefined;
  }

  /**
   * Convert AI matchingPairs format to UI format
   */
  private static convertMatchingPairs(aiPairs: any): any {
    if (!aiPairs) return undefined;
    
    // If already array format, return as-is
    if (Array.isArray(aiPairs)) return aiPairs;
    
    // Convert from AI format: {left: [], right: [], correctPairs: [[0,1]]}
    // to UI format: [{id, left, right}]
    if (aiPairs.left && aiPairs.right && aiPairs.correctPairs) {
      return aiPairs.correctPairs.map((pair: number[], idx: number) => ({
        id: `pair_${idx + 1}`,
        left: aiPairs.left[pair[0]] || '',
        right: aiPairs.right[pair[1]] || ''
      }));
    }
    
    return undefined;
  }

  /**
   * Parse questions từ Firebase Function response
   */
  private static parseQuestionsFromResponse(questionsData: any[]): Question[] {
    try {
      console.log('📥 Parsing questions data:', questionsData);
      
      if (!Array.isArray(questionsData)) {
        console.error('❌ questionsData is not an array:', typeof questionsData, questionsData);
        throw new Error('Dữ liệu câu hỏi không đúng định dạng (không phải array)');
      }

      if (questionsData.length === 0) {
        throw new Error('AI không trả về câu hỏi nào');
      }

      const questions: Question[] = [];
      
      for (let i = 0; i < questionsData.length; i++) {
        const questionData = questionsData[i];
        
        console.log(`📝 Processing question ${i + 1}:`, questionData);

        // Accept both 'text' and 'question' field
        const questionText = questionData.text || questionData.question;
        if (!questionText) {
          console.warn(`⚠️ Question ${i + 1} missing text/question field, skipping`);
          continue;
        }

        // Validate based on question type
        const questionType: QuestionType = questionData.type || 'multiple';
        const needsAnswers = ['multiple', 'boolean', 'checkbox', 'image', 'audio', 'video'].includes(questionType);
        
        if (needsAnswers && (!questionData.answers || !Array.isArray(questionData.answers))) {
          console.warn(`⚠️ Question ${i + 1} (type: ${questionType}) missing answers array, skipping`);
          continue;
        }

        const question: Question = {
          id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: questionText,
          type: questionType,
          answers: questionData.answers?.map((answer: any, index: number) => ({
            id: `a_${index + 1}`,
            text: answer.text || '',
            isCorrect: answer.isCorrect === true
          })) || [],
          explanation: questionData.explanation || '',
          points: questionData.points || 10,
          difficulty: questionData.difficulty || 'medium',
          // Advanced question type fields
          correctAnswer: questionData.correctAnswer,
          acceptedAnswers: questionData.acceptedAnswers,
          orderingItems: this.convertOrderingItems(questionData.orderingItems),
          matchingPairs: this.convertMatchingPairs(questionData.matchingPairs),
          textWithBlanks: questionData.textWithBlanks,
          blanks: this.convertBlanks(questionData.blanks)
        };

        // Validate question based on type
        let isValid = false;
        
        if (question.text) {
          switch (questionType) {
            case 'multiple':
            case 'boolean':
            case 'checkbox':
            case 'image':
            case 'audio':
            case 'video':
              isValid = question.answers.length >= 2;
              break;
            case 'short_answer':
              isValid = !!question.correctAnswer;
              break;
            case 'ordering':
              isValid = !!question.orderingItems && question.orderingItems.length > 0;
              break;
            case 'matching':
              isValid = !!question.matchingPairs;
              break;
            case 'fill_blanks':
              isValid = !!question.textWithBlanks || !!question.blanks;
              break;
            default:
              isValid = question.answers.length >= 2;
          }
        }
        
        if (isValid) {
          questions.push(question);
          console.log(`✅ Question ${i + 1} (${questionType}) parsed successfully`);
        } else {
          console.warn(`⚠️ Question ${i + 1} (${questionType}) validation failed:`, {
            hasText: !!question.text,
            answersLength: question.answers.length,
            hasCorrectAnswer: !!question.correctAnswer,
            hasOrderingItems: !!question.orderingItems,
            hasMatchingPairs: !!question.matchingPairs
          });
        }
      }

      if (questions.length === 0) {
        throw new Error('Không có câu hỏi hợp lệ nào được tạo từ AI');
      }

      console.log(`✅ Successfully parsed ${questions.length}/${questionsData.length} questions`);
      return questions;
    } catch (error) {
      console.error('❌ Error parsing questions from response:', error);
      console.error('Raw questionsData:', questionsData);
      throw new Error(`Không thể phân tích câu hỏi từ AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Kiểm tra availability của Firebase AI
   */
  static async checkAvailability(): Promise<boolean> {
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        return false;
      }

      // Test với một request đơn giản
      const testGenerate = httpsCallable(this.functions, 'testAI');
      const result = await testGenerate({ test: true });
      
      return result.data ? true : false;
    } catch (error) {
      console.error('Firebase AI not available:', error);
      return false;
    }
  }
}

export default FirebaseAIService;

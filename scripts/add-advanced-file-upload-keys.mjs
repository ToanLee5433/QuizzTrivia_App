#!/usr/bin/env node

/**
 * Thêm translation keys cho AdvancedFileUpload component
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const viPath = path.join(rootDir, 'public/locales/vi/common.json');
const enPath = path.join(rootDir, 'public/locales/en/common.json');

const viData = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Thêm keys mới cho file upload
const newKeys = {
  vi: {
    fileUpload: {
      unsupportedFormat: "Định dạng file không được hỗ trợ",
      processing: "Đang xử lý file: {{filename}}...",
      cannotReadFile: "Không thể đọc file",
      extractedSuccess: "Đã trích xuất {{count}} ký tự từ file!",
      processingError: "Có lỗi xảy ra khi xử lý file",
      sampleContentCreated: "Đã tạo nội dung mẫu để bạn có thể test AI",
      noContentToGenerate: "Không có nội dung để tạo câu hỏi",
      connectingToAI: "Đang kết nối với AI service...",
      aiGeneratedSuccess: "✅ AI đã tạo {{count}} câu hỏi thành công!",
      aiGenerationError: "❌ Lỗi tạo câu hỏi: {{error}}",
      aiError: "Lỗi AI: {{error}}",
      usingSampleQuestions: "Đang sử dụng câu hỏi mẫu thay vì AI",
      importedQuestions: "Đã import {{count}} câu hỏi!",
      apiKeyWorking: "✅ API key hoạt động!",
      apiKeyError: "❌ API key lỗi: {{message}}",
      networkError: "❌ Network error: {{error}}",
      ocrError: "Lỗi đọc ảnh: {{error}}",
      pdfError: "Lỗi đọc PDF: {{error}}",
      wordError: "Lỗi đọc Word: {{error}}",
      textError: "Lỗi đọc text file: {{error}}",
      spreadsheetError: "Lỗi đọc spreadsheet: {{error}}",
      cannotExtractText: "Không thể trích xuất text từ ảnh. Vui lòng thử ảnh khác có text rõ ràng hơn.",
      noAIResponse: "AI service không trả về câu hỏi nào",
      aiServiceError: "❌ AI Service Error:",
      aiGenerationFailed: "AI generation failed: {{error}}",
      userChoseFallback: "🔄 User chose to use fallback mock questions",
      sampleQuestions: {
        question1: {
          text: "JavaScript được phát triển bởi công ty nào?",
          answer: "Netscape",
          explanation: "JavaScript được phát triển bởi Brendan Eich tại Netscape vào năm 1995."
        },
        question2: {
          text: "React là gì?",
          answer: "JavaScript library",
          explanation: "React là một JavaScript library để xây dựng user interface."
        }
      },
      customPrompt: "Hướng dẫn cụ thể cho AI về cách tạo câu hỏi..."
    }
  },
  en: {
    fileUpload: {
      unsupportedFormat: "Unsupported file format",
      processing: "Processing file: {{filename}}...",
      cannotReadFile: "Cannot read file",
      extractedSuccess: "Extracted {{count}} characters from file!",
      processingError: "Error occurred while processing file",
      sampleContentCreated: "Sample content created for AI testing",
      noContentToGenerate: "No content to generate questions",
      connectingToAI: "Connecting to AI service...",
      aiGeneratedSuccess: "✅ AI generated {{count}} questions successfully!",
      aiGenerationError: "❌ Error generating questions: {{error}}",
      aiError: "AI Error: {{error}}",
      usingSampleQuestions: "Using sample questions instead of AI",
      importedQuestions: "Imported {{count}} questions!",
      apiKeyWorking: "✅ API key is working!",
      apiKeyError: "❌ API key error: {{message}}",
      networkError: "❌ Network error: {{error}}",
      ocrError: "OCR Error: {{error}}",
      pdfError: "PDF Error: {{error}}",
      wordError: "Word Error: {{error}}",
      textError: "Text Error: {{error}}",
      spreadsheetError: "Spreadsheet Error: {{error}}",
      cannotExtractText: "Cannot extract text from image. Please try another image with clearer text.",
      noAIResponse: "AI service did not return any questions",
      aiServiceError: "❌ AI Service Error:",
      aiGenerationFailed: "AI generation failed: {{error}}",
      userChoseFallback: "🔄 User chose to use fallback mock questions",
      sampleQuestions: {
        question1: {
          text: "Which company developed JavaScript?",
          answer: "Netscape",
          explanation: "JavaScript was developed by Brendan Eich at Netscape in 1995."
        },
        question2: {
          text: "What is React?",
          answer: "JavaScript library",
          explanation: "React is a JavaScript library for building user interfaces."
        }
      },
      customPrompt: "Specific instructions for AI on how to generate questions..."
    }
  }
};

// Deep merge function
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Merge
deepMerge(viData, newKeys.vi);
deepMerge(enData, newKeys.en);

// Save
fs.writeFileSync(viPath, JSON.stringify(viData, null, 2), 'utf8');
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');

console.log('✅ Added AdvancedFileUpload translation keys!');
console.log('   📦 Added fileUpload.* keys with interpolation support');
console.log('   🌍 Both VI and EN translations ready');

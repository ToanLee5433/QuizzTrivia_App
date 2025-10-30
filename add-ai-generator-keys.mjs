import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Translation keys for AI Generator components
const aiGeneratorKeys = {
  vi: {
    aiGenerator: {
      connectionSuccess: "✅ Kết nối AI thành công!",
      connectionFailed: "❌ Không thể kết nối đến AI: {{message}}",
      connectionError: "❌ Lỗi kết nối AI",
      fileInvalid: "File không hợp lệ! Chỉ chấp nhận: {{extensions}}",
      fileTooLarge: "File quá lớn! Kích thước tối đa: 10MB",
      apiKeyMissing: "API key không được cấu hình",
      fileProcessSuccess: "Đã xử lý file {{filename}} thành công!",
      fileProcessError: "Không thể xử lý file này",
      fileProcessFailed: "Lỗi khi xử lý file",
      topicOrFileRequired: "Vui lòng nhập chủ đề hoặc tải lên file!",
      generateError: "❌ Có lỗi xảy ra khi tạo câu hỏi",
      difficulty: {
        easy: "🟢 Dễ",
        medium: "🟡 Trung bình",
        hard: "🔴 Khó"
      },
      testConnection: "Kiểm tra kết nối",
      testing: "Đang kiểm tra...",
      generate: "Tạo câu hỏi",
      generating: "Đang tạo...",
      uploadFile: "Tải file lên",
      processing: "Đang xử lý...",
      topic: "Chủ đề",
      topicPlaceholder: "Nhập chủ đề hoặc nội dung...",
      numQuestions: "Số câu hỏi",
      useFileContent: "Sử dụng nội dung file"
    }
  },
  en: {
    aiGenerator: {
      connectionSuccess: "✅ AI connection successful!",
      connectionFailed: "❌ Cannot connect to AI: {{message}}",
      connectionError: "❌ AI connection error",
      fileInvalid: "Invalid file! Only accept: {{extensions}}",
      fileTooLarge: "File too large! Maximum size: 10MB",
      apiKeyMissing: "API key is not configured",
      fileProcessSuccess: "Successfully processed file {{filename}}!",
      fileProcessError: "Cannot process this file",
      fileProcessFailed: "Error processing file",
      topicOrFileRequired: "Please enter a topic or upload a file!",
      generateError: "❌ Error occurred while generating questions",
      difficulty: {
        easy: "🟢 Easy",
        medium: "🟡 Medium",
        hard: "🔴 Hard"
      },
      testConnection: "Test Connection",
      testing: "Testing...",
      generate: "Generate Questions",
      generating: "Generating...",
      uploadFile: "Upload File",
      processing: "Processing...",
      topic: "Topic",
      topicPlaceholder: "Enter topic or content...",
      numQuestions: "Number of Questions",
      useFileContent: "Use file content"
    }
  }
};

// Read and update translation files
function updateTranslationFile(lang) {
  const filePath = path.join(__dirname, `public/locales/${lang}/common.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Add aiGenerator keys
  data.aiGenerator = aiGeneratorKeys[lang].aiGenerator;
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Updated ${lang}/common.json with aiGenerator keys`);
}

// Update both languages
updateTranslationFile('vi');
updateTranslationFile('en');

console.log('✅ Added AI Generator translation keys!');

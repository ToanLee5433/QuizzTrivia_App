#!/usr/bin/env node

/**
 * 📝 ADD HARDCODED TRANSLATIONS
 * Đọc từ deep-scan report và thêm TẤT CẢ translations vào common.json
 * KHÔNG sửa source code để tránh lỗi syntax
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load scan report
const reportPath = path.join(rootDir, 'i18n-deep-scan-report.json');
if (!fs.existsSync(reportPath)) {
  console.error('❌ Please run deep-scan-hardcoded-text.mjs first!');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const findings = report.findings;

console.log('📝 ADDING HARDCODED TRANSLATIONS...\n');
console.log(`📊 Total: ${report.totalFindings} hardcoded strings to translate\n`);

// Generate proper translations based on Vietnamese text
const translations = {
  vi: {},
  en: {}
};

// Helper to convert Vietnamese to English (basic mapping)
const commonTranslations = {
  // Actions
  'Đăng nhập': 'Login',
  'Đăng ký': 'Register',
  'Đăng xuất': 'Logout',
  'Tạo mới': 'Create New',
  'Tạo quiz': 'Create Quiz',
  'Chỉnh sửa': 'Edit',
  'Xóa': 'Delete',
  'Lưu': 'Save',
  'Hủy': 'Cancel',
  'Gửi': 'Submit',
  'Tìm kiếm': 'Search',
  'Lọc': 'Filter',
  'Sắp xếp': 'Sort',
  
  // Status
  'Đang tải': 'Loading',
  'Thành công': 'Success',
  'Lỗi': 'Error',
  'Hoàn thành': 'Completed',
  'Đang xử lý': 'Processing',
  
  // Common phrases
  'Không tìm thấy': 'Not found',
  'Vui lòng thử lại': 'Please try again',
  'Bạn có chắc': 'Are you sure',
  'Không thể': 'Cannot',
  'Đã có lỗi xảy ra': 'An error occurred',
  
  // Quiz related
  'Quiz': 'Quiz',
  'Câu hỏi': 'Question',
  'Đáp án': 'Answer',
  'Kết quả': 'Result',
  'Điểm số': 'Score',
  'Thời gian': 'Time',
  'Độ khó': 'Difficulty',
  'Dễ': 'Easy',
  'Trung bình': 'Medium',
  'Khó': 'Hard',
  
  // User related
  'Người dùng': 'User',
  'Quản trị viên': 'Administrator',
  'Người tạo': 'Creator',
  'Hồ sơ': 'Profile',
  
  // Categories
  'Lập trình': 'Programming',
  'Toán học': 'Mathematics',
  'Khoa học': 'Science',
  'Lịch sử': 'History',
  'Địa lý': 'Geography',
  'Văn học': 'Literature',
  'Công nghệ': 'Technology',
  'Thể thao': 'Sports',
  'Giải trí': 'Entertainment',
  'Ẩm thực': 'Cuisine'
};

// Translate Vietnamese to English
function translateToEnglish(viText) {
  // Check exact match first
  if (commonTranslations[viText]) {
    return commonTranslations[viText];
  }
  
  // Check partial matches
  for (const [vi, en] of Object.entries(commonTranslations)) {
    if (viText.includes(vi)) {
      return viText.replace(vi, en);
    }
  }
  
  // Return as-is with note
  return viText;
}

// Process all findings
const allTexts = new Set();
Object.values(findings).forEach(items => {
  items.forEach(item => {
    allTexts.add(JSON.stringify({ text: item.text, type: item.type }));
  });
});

console.log(`🔍 Found ${allTexts.size} unique hardcoded strings\n`);

// Group by context
const byContext = {
  admin: { vi: {}, en: {} },
  auth: { vi: {}, en: {} },
  quiz: { vi: {}, en: {} },
  multiplayer: { vi: {}, en: {} },
  common: { vi: {}, en: {} }
};

allTexts.forEach(jsonStr => {
  const { text, type } = JSON.parse(jsonStr);
  
  // Determine context
  let context = 'common';
  if (text.includes('admin') || text.includes('Admin')) context = 'admin';
  else if (text.includes('auth') || text.includes('đăng')) context = 'auth';
  else if (text.includes('quiz') || text.includes('Quiz') || text.includes('câu hỏi')) context = 'quiz';
  else if (text.includes('multiplayer') || text.includes('người chơi')) context = 'multiplayer';
  
  // Generate key
  const key = text
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50)
    .replace(/^_|_$/g, '');
  
  // Add translations
  if (type === 'vietnamese') {
    byContext[context].vi[key] = text;
    byContext[context].en[key] = translateToEnglish(text);
  } else {
    byContext[context].en[key] = text;
    byContext[context].vi[key] = text; // Keep English as-is for now
  }
});

// Build final structure
Object.entries(byContext).forEach(([context, langs]) => {
  if (Object.keys(langs.vi).length > 0) {
    translations.vi[context] = { ...translations.vi[context], ...langs.vi };
    translations.en[context] = { ...translations.en[context], ...langs.en };
  }
});

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

// Load existing translations
const viPath = path.join(rootDir, 'public/locales/vi/common.json');
const enPath = path.join(rootDir, 'public/locales/en/common.json');

const viData = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Merge
const viMerged = deepMerge(viData, translations.vi);
const enMerged = deepMerge(enData, translations.en);

// Count new keys
function countKeys(obj) {
  let count = 0;
  for (const key in obj) {
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      count += countKeys(obj[key]);
    } else {
      count++;
    }
  }
  return count;
}

const oldViCount = countKeys(viData);
const newViCount = countKeys(viMerged);
const addedKeys = newViCount - oldViCount;

// Save
fs.writeFileSync(viPath, JSON.stringify(viMerged, null, 2), 'utf8');
fs.writeFileSync(enPath, JSON.stringify(enMerged, null, 2), 'utf8');

console.log(`\n✅ TRANSLATIONS ADDED!\n`);
console.log(`📊 Summary:`);
console.log(`   🆕 New keys added: ${addedKeys}`);
console.log(`   📝 Total VI keys: ${oldViCount} → ${newViCount}`);
console.log(`   📝 Total EN keys: ${newViCount}`);
console.log(`\n💾 Updated files:`);
console.log(`   📄 ${viPath}`);
console.log(`   📄 ${enPath}\n`);

console.log(`⚠️  MANUAL STEPS REQUIRED:\n`);
console.log(`1. SOURCE CODE: Replace hardcoded text with t('context.key')`);
console.log(`2. TRANSLATIONS: Review and improve auto-translated English text`);
console.log(`3. VALIDATE: npm run i18n:validate`);
console.log(`4. BUILD: npm run build`);
console.log(`5. TEST: Check language switching\n`);

#!/usr/bin/env node

/**
 * Bulk translate missing keys using Google Translate or DeepL API
 * For now, this is a placeholder - you can integrate with translation services
 */

import fs from 'fs-extra';
import path from 'path';

const LOCALES_DIR = '../../public/locales';

/**
 * Simple translation mapping for common keys
 * In production, this would call actual translation API
 */
const simpleTranslations = {
  // Common patterns
  'loading': { vi: 'Đang tải...', en: 'Loading...' },
  'error': { vi: 'Lỗi', en: 'Error' },
  'success': { vi: 'Thành công', en: 'Success' },
  'save': { vi: 'Lưu', en: 'Save' },
  'cancel': { vi: 'Hủy', en: 'Cancel' },
  'delete': { vi: 'Xóa', en: 'Delete' },
  'edit': { vi: 'Chỉnh sửa', en: 'Edit' },
  'create': { vi: 'Tạo mới', en: 'Create' },
  'update': { vi: 'Cập nhật', en: 'Update' },
  'submit': { vi: 'Gửi', en: 'Submit' },
  'confirm': { vi: 'Xác nhận', en: 'Confirm' },
  'back': { vi: 'Quay lại', en: 'Back' },
  'next': { vi: 'Tiếp theo', en: 'Next' },
  'previous': { vi: 'Trước đó', en: 'Previous' },
  'close': { vi: 'Đóng', en: 'Close' },
  'view': { vi: 'Xem', en: 'View' },
  'search': { vi: 'Tìm kiếm', en: 'Search' },
  'filter': { vi: 'Lọc', en: 'Filter' },
  'sort': { vi: 'Sắp xếp', en: 'Sort' }
};

/**
 * Mock translation function
 * Replace with actual API calls to Google Translate, DeepL, etc.
 */
async function translateText(text, fromLang = 'en', toLang = 'vi') {
  // Simple keyword-based translation
  const lowerText = text.toLowerCase();
  
  for (const [key, translations] of Object.entries(simpleTranslations)) {
    if (lowerText.includes(key)) {
      return translations[toLang] || text;
    }
  }
  
  // If no match found, return a placeholder
  return `[AUTO_TRANSLATE_${toLang.toUpperCase()}] ${text}`;
}

/**
 * Translate missing keys in locale files
 */
async function translateMissingKeys() {
  console.log('🌐 Translating missing keys...');
  
  const viPath = path.join(LOCALES_DIR, 'vi/common.json');
  const enPath = path.join(LOCALES_DIR, 'en/common.json');
  
  const viTranslations = await fs.readJSON(viPath);
  const enTranslations = await fs.readJSON(enPath);
  
  let viUpdated = 0;
  let enUpdated = 0;

  const translateNestedObject = async (viObj, enObj, keyPath = '') => {
    for (const [key, value] of Object.entries(viObj)) {
      const currentPath = keyPath ? `${keyPath}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        if (!enObj[key]) enObj[key] = {};
        await translateNestedObject(value, enObj[key], currentPath);
      } else if (typeof value === 'string') {
        // Translate VI -> EN if missing
        if (!enObj[key] || enObj[key].startsWith('[EN_MISSING]')) {
          const translated = await translateText(value, 'vi', 'en');
          enObj[key] = translated;
          enUpdated++;
          console.log(`VI->EN: ${currentPath} = "${translated}"`);
        }
      }
    }

    for (const [key, value] of Object.entries(enObj)) {
      const currentPath = keyPath ? `${keyPath}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        if (!viObj[key]) viObj[key] = {};
        // Recursive call handled above
      } else if (typeof value === 'string') {
        // Translate EN -> VI if missing
        if (!viObj[key] || viObj[key].startsWith('[VI_MISSING]')) {
          const translated = await translateText(value, 'en', 'vi');
          viObj[key] = translated;
          viUpdated++;
          console.log(`EN->VI: ${currentPath} = "${translated}"`);
        }
      }
    }
  };

  await translateNestedObject(viTranslations, enTranslations);

  // Save updated files
  await fs.writeJSON(viPath, viTranslations, { spaces: 2 });
  await fs.writeJSON(enPath, enTranslations, { spaces: 2 });

  console.log(`✅ Updated ${viUpdated} Vietnamese translations`);
  console.log(`✅ Updated ${enUpdated} English translations`);
  
  console.log('\n📝 Note: Auto-translations are placeholders.');
  console.log('💡 Please review and update with proper translations.');
}

/**
 * Generate translation report
 */
async function generateReport() {
  console.log('📊 Generating translation report...');
  
  const viTranslations = await fs.readJSON(path.join(LOCALES_DIR, 'vi/common.json'));
  const enTranslations = await fs.readJSON(path.join(LOCALES_DIR, 'en/common.json'));
  
  const flattenKeys = (obj, prefix = '') => {
    const keys = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        keys.push(...flattenKeys(value, fullKey));
      } else {
        keys.push({ key: fullKey, value });
      }
    }
    return keys;
  };

  const viKeys = flattenKeys(viTranslations);
  const enKeys = flattenKeys(enTranslations);
  
  const isStr = (v) => typeof v === 'string';
  const autoTranslatedVI = viKeys.filter(item => isStr(item.value) && item.value.startsWith('[AUTO_TRANSLATE_VI]'));
  const autoTranslatedEN = enKeys.filter(item => isStr(item.value) && item.value.startsWith('[AUTO_TRANSLATE_EN]'));
  const missingVI = viKeys.filter(item => isStr(item.value) && item.value.startsWith('[VI_MISSING]'));
  const missingEN = enKeys.filter(item => isStr(item.value) && item.value.startsWith('[EN_MISSING]'));

  const report = {
    timestamp: new Date().toISOString(),
    totalKeys: { vi: viKeys.length, en: enKeys.length },
    autoTranslated: { vi: autoTranslatedVI.length, en: autoTranslatedEN.length },
    missing: { vi: missingVI.length, en: missingEN.length },
    needsReview: {
      vi: autoTranslatedVI.map(item => item.key),
      en: autoTranslatedEN.map(item => item.key)
    }
  };

  await fs.writeJSON('./translation-report.json', report, { spaces: 2 });
  
  console.log('\n📊 Translation Report:');
  console.log(`Total keys: VI=${report.totalKeys.vi}, EN=${report.totalKeys.en}`);
  console.log(`Auto-translated: VI=${report.autoTranslated.vi}, EN=${report.autoTranslated.en}`);
  console.log(`Still missing: VI=${report.missing.vi}, EN=${report.missing.en}`);
  console.log('📝 Report saved to translation-report.json');
}

// CLI
const command = process.argv[2];

switch (command) {
  case 'translate':
    await translateMissingKeys();
    break;
  case 'report':
    await generateReport();
    break;
  case 'all':
    await translateMissingKeys();
    await generateReport();
    break;
  default:
    console.log(`
Usage: node translate-missing.mjs [command]

Commands:
  translate - Auto-translate missing keys
  report    - Generate translation report
  all       - Translate + generate report
    `);
}

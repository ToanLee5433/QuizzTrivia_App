#!/usr/bin/env node

/**
 * 🔧 AUTO-FIX HARDCODED TEXT
 * Tự động chuyển đổi hardcoded Vietnamese/English text thành t() calls
 * và thêm translation keys vào common.json
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

console.log('🔧 AUTO-FIXING HARDCODED TEXT...\n');
console.log(`📊 Total: ${report.totalFindings} hardcoded strings in ${report.fileCount} files\n`);

// Generate translation key from text
function generateKeyFromText(text, context = '') {
  // Clean text
  let key = text
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40);

  // Add context prefix
  if (context) {
    key = `${context}.${key}`;
  }

  return key;
}

// Determine context from file path
function getContextFromPath(filePath) {
  const lower = filePath.toLowerCase();
  
  if (lower.includes('admin')) return 'admin';
  if (lower.includes('auth')) return 'auth';
  if (lower.includes('quiz')) return 'quiz';
  if (lower.includes('multiplayer')) return 'multiplayer';
  if (lower.includes('profile')) return 'profile';
  if (lower.includes('leaderboard')) return 'leaderboard';
  if (lower.includes('review')) return 'reviews';
  if (lower.includes('result')) return 'results';
  if (lower.includes('category') || lower.includes('categories')) return 'categories';
  
  return 'common';
}

// New translations to add
const newTranslations = {
  vi: {},
  en: {}
};

let filesModified = 0;
let stringsConverted = 0;

// Process each file
Object.entries(findings).forEach(([filePath, items]) => {
  const fullPath = path.join(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skip: ${filePath} (not found)`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  const context = getContextFromPath(filePath);
  
  // Sort by line number descending to avoid offset issues
  const sortedItems = [...items].sort((a, b) => b.line - a.line);
  
  sortedItems.forEach(item => {
    const { text, type } = item;
    
    // Generate translation key
    const baseKey = generateKeyFromText(text);
    let key = `${context}.${baseKey}`;
    
    // Ensure unique key
    let counter = 1;
    while (newTranslations.vi[key] || newTranslations.en[key]) {
      key = `${context}.${baseKey}_${counter}`;
      counter++;
    }
    
    // Add to translations
    if (type === 'vietnamese') {
      newTranslations.vi[key] = text;
      newTranslations.en[key] = `[EN: ${text}]`; // Placeholder for English
    } else {
      newTranslations.en[key] = text;
      newTranslations.vi[key] = `[VI: ${text}]`; // Placeholder for Vietnamese
    }
    
    // Replace in file
    // Handle different quote styles
    const patterns = [
      `"${text}"`,
      `'${text}'`,
      `\`${text}\``
    ];
    
    let replaced = false;
    for (const pattern of patterns) {
      if (content.includes(pattern)) {
        // Check if it's in JSX context
        const beforePattern = content.substring(0, content.indexOf(pattern));
        const isInJSX = beforePattern.lastIndexOf('>') > beforePattern.lastIndexOf('{');
        
        if (isInJSX) {
          // JSX: replace with {t('key')}
          content = content.replace(pattern, `{t('${key}')}`);
        } else {
          // JS: replace with t('key')
          content = content.replace(pattern, `t('${key}')`);
        }
        
        replaced = true;
        modified = true;
        stringsConverted++;
        break;
      }
    }
    
    if (!replaced) {
      console.log(`   ⚠️  Could not replace: "${text}" in ${filePath}:${item.line}`);
    }
  });
  
  if (modified) {
    // Ensure file imports useTranslation
    if (!content.includes('useTranslation') && !content.includes('import { t }')) {
      // Add import at top
      const importLine = "import { useTranslation } from 'react-i18next';\n";
      
      // Find first import
      const firstImportMatch = content.match(/^import /m);
      if (firstImportMatch) {
        const insertPos = firstImportMatch.index;
        content = content.substring(0, insertPos) + importLine + content.substring(insertPos);
      }
      
      // Add const { t } if component
      if (content.includes('const ') && content.includes('= () => {')) {
        const componentMatch = content.match(/const \w+ = \(\) => \{/);
        if (componentMatch) {
          const insertPos = componentMatch.index + componentMatch[0].length;
          content = content.substring(0, insertPos) + "\n  const { t } = useTranslation();" + content.substring(insertPos);
        }
      }
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    filesModified++;
    console.log(`✅ Fixed: ${filePath} (${items.length} strings)`);
  }
});

console.log(`\n📊 CONVERSION SUMMARY:`);
console.log(`   ✅ Files modified: ${filesModified}`);
console.log(`   🔤 Strings converted: ${stringsConverted}`);
console.log(`   🆕 New translation keys: ${Object.keys(newTranslations.vi).length}\n`);

// Add new translations to common.json
const viPath = path.join(rootDir, 'public/locales/vi/common.json');
const enPath = path.join(rootDir, 'public/locales/en/common.json');

const viData = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Merge new translations
function deepMerge(target, source) {
  Object.keys(source).forEach(key => {
    if (key.includes('.')) {
      // Nested key like "admin.greeting"
      const parts = key.split('.');
      let current = target;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = source[key];
    } else {
      target[key] = source[key];
    }
  });
  return target;
}

deepMerge(viData, newTranslations.vi);
deepMerge(enData, newTranslations.en);

// Save
fs.writeFileSync(viPath, JSON.stringify(viData, null, 2), 'utf8');
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');

console.log(`💾 Updated translation files:`);
console.log(`   📄 ${viPath}`);
console.log(`   📄 ${enPath}\n`);

console.log(`✅ AUTO-FIX COMPLETED!\n`);
console.log(`⚠️  MANUAL REVIEW REQUIRED:`);
console.log(`   - Check placeholders: [EN: ...] and [VI: ...]`);
console.log(`   - Translate them to proper language`);
console.log(`   - Test the app to verify all text displays correctly\n`);

console.log(`📝 NEXT STEPS:`);
console.log(`   1. npm run i18n:validate  - Validate translations`);
console.log(`   2. Review and translate [EN: ...] / [VI: ...] placeholders`);
console.log(`   3. npm run build          - Build the app`);
console.log(`   4. Test language switching in browser\n`);

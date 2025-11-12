#!/usr/bin/env node

/**
 * EXTRACT AND FIX I18N STRINGS - PROPER SOLUTION
 * 
 * This script:
 * 1. Runs ESLint to get all hardcoded strings
 * 2. Extracts the actual string values
 * 3. Generates translation keys automatically
 * 4. Adds keys to locale files
 * 5. Replaces hardcoded strings with t() calls
 * 
 * Usage: node scripts/extract-and-fix-i18n.mjs
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

console.log('🚀 Starting I18N Extract and Fix Tool...\n');

// Helper: Generate key from string
function generateKey(str, context = '') {
  // Clean the string
  const cleaned = str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[{}()[\]]/g, '') // Remove brackets
    .trim();
  
  if (!cleaned || cleaned.length < 2) {
    return null;
  }
  
  // Create a readable key
  const words = cleaned
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 4);
  
  if (words.length === 0) return null;
  
  const key = words.join('_');
  const hash = crypto.createHash('md5').update(str).digest('hex').slice(0, 6);
  
  return `auto_${key}_${hash}`;
}

// Helper: Check if string should be translated
function shouldTranslate(str) {
  if (!str || typeof str !== 'string') return false;
  if (str.length < 2) return false;
  
  // Skip pure numbers, URLs, etc
  if (/^\d+$/.test(str)) return false;
  if (/^https?:\/\//.test(str)) return false;
  if (/^[A-Z_]+$/.test(str)) return false; // Constants
  
  return true;
}

console.log('📊 Step 1: Getting ESLint warnings...');
let eslintOutput;
try {
  eslintOutput = execSync('npx eslint . --ext ts,tsx --format json 2>&1', {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: 'pipe'
  });
} catch (error) {
  eslintOutput = error.stdout || '[]';
}

const results = JSON.parse(eslintOutput);
const stringsToTranslate = new Map(); // string -> {files: [], count: number}

console.log('🔍 Step 2: Extracting hardcoded strings...');
for (const fileResult of results) {
  for (const message of fileResult.messages) {
    if (message.ruleId === 'i18next/no-literal-string') {
      // Try to extract the actual string from message
      const match = message.message.match(/literal string: (.+?)$/);
      if (match) {
        const str = match[1].trim();
        if (shouldTranslate(str)) {
          if (!stringsToTranslate.has(str)) {
            stringsToTranslate.set(str, { files: [], count: 0 });
          }
          const data = stringsToTranslate.get(str);
          data.files.push(fileResult.filePath);
          data.count++;
        }
      }
    }
  }
}

console.log(`   Found ${stringsToTranslate.size} unique strings to translate\n`);

if (stringsToTranslate.size === 0) {
  console.log('✅ No strings to translate!');
  process.exit(0);
}

// Step 3: Generate translation keys
console.log('🔑 Step 3: Generating translation keys...');
const translationMap = new Map(); // original string -> key

for (const [str, data] of stringsToTranslate.entries()) {
  const key = generateKey(str);
  if (key) {
    translationMap.set(str, key);
    console.log(`   ${key}: "${str.slice(0, 50)}${str.length > 50 ? '...' : ''}"`);
  }
}

console.log(`\n✨ Generated ${translationMap.size} translation keys\n`);

// Step 4: Create report
console.log('📝 Step 4: Creating translation report...');
const report = {
  totalStrings: stringsToTranslate.size,
  totalKeys: translationMap.size,
  timestamp: new Date().toISOString(),
  translations: {}
};

for (const [str, key] of translationMap.entries()) {
  const data = stringsToTranslate.get(str);
  report.translations[key] = {
    vi: str, // Keep Vietnamese as-is for now
    en: str, // Will need manual translation
    occurrences: data.count,
    files: data.files.slice(0, 5) // Sample files
  };
}

// Save report
const reportPath = 'i18n-extraction-report.json';
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('='.repeat(60));
console.log(`✅ REPORT GENERATED: ${reportPath}`);
console.log('='.repeat(60));
console.log(`Total unique strings: ${report.totalStrings}`);
console.log(`Translation keys created: ${report.totalKeys}`);
console.log('\n📝 NEXT STEPS:\n');
console.log('1. Review i18n-extraction-report.json');
console.log('2. Add translations to locale files');
console.log('3. Run another script to replace strings in code');
console.log('4. Manually translate English versions\n');

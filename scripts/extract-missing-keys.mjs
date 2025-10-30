#!/usr/bin/env node

/**
 * 🔍 Extract missing translation keys from source code
 * Scans all .tsx/.ts files and finds t('key') calls that don't exist in translation files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const LOCALES_DIR = path.join(rootDir, 'public', 'locales');
const SRC_DIR = path.join(rootDir, 'src');

console.log('🔍 Extracting missing translation keys...\n');

// Load existing translations
const viPath = path.join(LOCALES_DIR, 'vi', 'common.json');
const enPath = path.join(LOCALES_DIR, 'en', 'common.json');

const viTranslations = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Get all keys from translations
function getAllKeys(obj, prefix = '') {
  const keys = new Set();
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      getAllKeys(value, fullKey).forEach(k => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  
  return keys;
}

const existingKeys = getAllKeys(viTranslations);
console.log(`📝 Found ${existingKeys.size} existing keys in translations\n`);

// Scan source files for t('key') calls
console.log('🔎 Scanning source files...\n');

const sourceFiles = glob.sync('**/*.{ts,tsx}', {
  cwd: SRC_DIR,
  absolute: true,
  ignore: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/node_modules/**']
});

console.log(`📂 Found ${sourceFiles.length} source files\n`);

const usedKeys = new Set();
const keyPattern = /t\(['"]([\w.]+)['"]/g;

sourceFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  
  while ((match = keyPattern.exec(content)) !== null) {
    usedKeys.add(match[1]);
  }
});

console.log(`🔑 Found ${usedKeys.size} unique t() calls in code\n`);

// Find missing keys
const missingKeys = Array.from(usedKeys).filter(key => !existingKeys.has(key));

if (missingKeys.length === 0) {
  console.log('✅ No missing keys! All translations are up to date.\n');
  process.exit(0);
}

console.log(`❌ Found ${missingKeys.length} missing keys:\n`);

// Group by prefix
const grouped = {};
missingKeys.forEach(key => {
  const parts = key.split('.');
  const prefix = parts.length > 1 ? parts[0] : '_root';
  
  if (!grouped[prefix]) {
    grouped[prefix] = [];
  }
  grouped[prefix].push(key);
});

// Display grouped
Object.entries(grouped).sort().forEach(([prefix, keys]) => {
  console.log(`\n📦 ${prefix}:`);
  keys.sort().forEach(key => {
    console.log(`   - ${key}`);
  });
});

// Generate template
console.log('\n\n📋 Generated translation template:\n');
console.log('```json');

function buildNestedObject(keys) {
  const result = {};
  
  keys.forEach(key => {
    const parts = key.split('.');
    let current = result;
    
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        current[part] = `[TRANSLATE] ${key}`;
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    });
  });
  
  return result;
}

const template = buildNestedObject(missingKeys);
console.log(JSON.stringify(template, null, 2));
console.log('```\n');

// Save to file
const outputPath = path.join(rootDir, 'missing-translations.json');
fs.writeFileSync(outputPath, JSON.stringify({
  vi: template,
  en: template,
  missingKeys: missingKeys.sort(),
  timestamp: new Date().toISOString()
}, null, 2));

console.log(`💾 Saved to: ${outputPath}\n`);
console.log('🔧 To fix: Copy the generated JSON and merge into your translation files.\n');

process.exit(1);

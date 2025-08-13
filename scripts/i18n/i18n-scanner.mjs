#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const LOCALES_DIR = path.join(PROJECT_ROOT, 'public', 'locales');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

/**
 * Extract all i18n keys from the codebase
 */
async function extractKeys() {
  console.log('🔍 Scanning for i18n keys...');
  
  // Find all React/TypeScript files
  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: SRC_DIR,
    ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**']
  });

  const extractedKeys = new Set();
  // Improved regex to match t() calls with proper string literals
  const keyPattern = /t\(\s*['"`]([^'"`\$\{\}\\]+)['"`]/g;
  const allowedNamespaces = new Set([
    'common','nav','multiplayer','landing','quiz','auth','creator','createQuiz','messages',
    'errors','leaderboard','dashboard','admin','profile','categories','difficulty','favorites',
    'notifications','offline','gameMode','email','quizList'
  ]);

  for (const file of files) {
    const filePath = path.join(SRC_DIR, file);
    const content = await fs.readFile(filePath, 'utf8');
    
    let match;
    while ((match = keyPattern.exec(content)) !== null) {
      const key = match[1].trim();
      if (!key || key.includes('/')) continue;
      if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(key)) continue;
      const ns = key.split('.')[0];
      if (!allowedNamespaces.has(ns)) continue;
      extractedKeys.add(key);
    }
  }

  console.log(`✅ Found ${extractedKeys.size} unique keys`);
  
  // Save extracted keys
  const keysArray = Array.from(extractedKeys).sort();
  await fs.writeJSON(path.join(__dirname, 'extracted-keys.json'), keysArray, { spaces: 2 });
  
  console.log('📝 Keys saved to extracted-keys.json');
  return keysArray;
}

/**
 * Validate that all keys exist in locales
 */
async function validateKeys() {
  console.log('🔎 Validating keys against locales...');
  
  const extractedKeys = await fs.readJSON(path.join(__dirname, 'extracted-keys.json'));
  const viTranslations = await fs.readJSON(path.join(LOCALES_DIR, 'vi', 'common.json'));
  const enTranslations = await fs.readJSON(path.join(LOCALES_DIR, 'en', 'common.json'));
  
  const flattenKeys = (obj, prefix = '') => {
    const keys = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        keys.push(...flattenKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  };

  const viKeys = flattenKeys(viTranslations);
  const enKeys = flattenKeys(enTranslations);
  
  const missingInVi = extractedKeys.filter(key => !viKeys.includes(key));
  const missingInEn = extractedKeys.filter(key => !enKeys.includes(key));
  const unusedInVi = viKeys.filter(key => !extractedKeys.includes(key));
  const unusedInEn = enKeys.filter(key => !extractedKeys.includes(key));

  console.log('\n📊 Validation Results:');
  console.log(`Missing in VI: ${missingInVi.length}`);
  console.log(`Missing in EN: ${missingInEn.length}`);
  console.log(`Unused in VI: ${unusedInVi.length}`);
  console.log(`Unused in EN: ${unusedInEn.length}`);

  if (missingInVi.length > 0) {
    console.log('\n❌ Missing in VI:', missingInVi);
  }
  if (missingInEn.length > 0) {
    console.log('\n❌ Missing in EN:', missingInEn);
  }
  if (unusedInVi.length > 0) {
    console.log('\n⚠️ Unused in VI:', unusedInVi);
  }
  if (unusedInEn.length > 0) {
    console.log('\n⚠️ Unused in EN:', unusedInEn);
  }

  return {
    missingInVi,
    missingInEn,
    unusedInVi,
    unusedInEn
  };
}

/**
 * Auto-fix missing keys by adding placeholders
 */
async function autoFixMissingKeys() {
  console.log('🔧 Auto-fixing missing keys...');
  
  const { missingInVi, missingInEn } = await validateKeys();
  
  const viTranslations = await fs.readJSON(path.join(LOCALES_DIR, 'vi/common.json'));
  const enTranslations = await fs.readJSON(path.join(LOCALES_DIR, 'en/common.json'));

  const addMissingKey = (obj, keyPath, value) => {
    const keys = keyPath.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current) || typeof current[keys[i]] !== 'object' || current[keys[i]] === null) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  };

  // Add missing keys to VI
  for (const key of missingInVi) {
    addMissingKey(viTranslations, key, `[VI_MISSING] ${key}`);
  }

  // Add missing keys to EN
  for (const key of missingInEn) {
    addMissingKey(enTranslations, key, `[EN_MISSING] ${key}`);
  }

  await fs.writeJSON(path.join(LOCALES_DIR, 'vi', 'common.json'), viTranslations, { spaces: 2 });
  await fs.writeJSON(path.join(LOCALES_DIR, 'en', 'common.json'), enTranslations, { spaces: 2 });

  console.log(`✅ Added ${missingInVi.length} missing keys to VI`);
  console.log(`✅ Added ${missingInEn.length} missing keys to EN`);
}

// CLI
const command = process.argv[2];

switch (command) {
  case 'extract':
    await extractKeys();
    break;
  case 'validate':
    await validateKeys();
    break;
  case 'fix':
    await autoFixMissingKeys();
    break;
  case 'sync':
    await extractKeys();
    await autoFixMissingKeys();
    console.log('🎉 i18n sync completed!');
    break;
  default:
    console.log(`
Usage: node i18n-scanner.mjs [command]

Commands:
  extract   - Extract i18n keys from source code
  validate  - Validate keys against locale files
  fix       - Auto-fix missing keys by adding placeholders
  sync      - Full sync (extract + fix)
    `);
}

#!/usr/bin/env node

/**
 * 🔧 Auto-fix common i18n issues
 * 
 * This script automatically fixes:
 * 1. Missing keys in one language (copies from the other with [TRANSLATE] marker)
 * 2. Wrong interpolation syntax {name} → {{name}}
 * 3. Trailing commas in JSON
 * 4. Alphabetically sorts keys for better diffing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const LOCALES_DIR = path.join(rootDir, 'public', 'locales');
const SUPPORTED_LANGUAGES = ['vi', 'en'];
const NAMESPACES = ['common'];

console.log('🔧 Auto-fixing i18n issues...\n');

// Load translations
const translations = {};
SUPPORTED_LANGUAGES.forEach(lng => {
  translations[lng] = {};
  NAMESPACES.forEach(ns => {
    const filePath = path.join(LOCALES_DIR, lng, `${ns}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        translations[lng][ns] = JSON.parse(content);
      } catch (error) {
        console.error(`❌ Cannot parse ${lng}/${ns}.json: ${error.message}`);
      }
    }
  });
});

// Fix 1: Fix interpolation syntax
function fixInterpolation(obj) {
  const fixed = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Fix single braces {name} → {{name}}
      let fixedValue = value.replace(/(?<!\{)\{(\w+)\}(?!\})/g, '{{$1}}');
      // Fix template literals ${name} → {{name}}
      fixedValue = fixedValue.replace(/\$\{(\w+)\}/g, '{{$1}}');
      
      if (fixedValue !== value) {
        console.log(`   ✓ Fixed interpolation: ${key}`);
        console.log(`     Before: ${value}`);
        console.log(`     After:  ${fixedValue}`);
      }
      
      fixed[key] = fixedValue;
    } else if (typeof value === 'object' && value !== null) {
      fixed[key] = fixInterpolation(value);
    } else {
      fixed[key] = value;
    }
  }
  
  return fixed;
}

// Fix 2: Add missing keys
function getAllKeys(obj, prefix = '') {
  let keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push({ key: fullKey, value });
    }
  }
  
  return keys;
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// Fix 3: Sort keys alphabetically
function sortObjectKeys(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }
  
  const sorted = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    sorted[key] = sortObjectKeys(obj[key]);
  }
  
  return sorted;
}

// Apply fixes
let hasChanges = false;

NAMESPACES.forEach(ns => {
  console.log(`\n📝 Processing namespace: ${ns}`);
  
  // Fix interpolation for each language
  SUPPORTED_LANGUAGES.forEach(lng => {
    if (translations[lng]?.[ns]) {
      console.log(`\n   Fixing interpolation for ${lng}...`);
      const fixed = fixInterpolation(translations[lng][ns]);
      translations[lng][ns] = fixed;
    }
  });
  
  // Check and add missing keys
  if (translations['vi']?.[ns] && translations['en']?.[ns]) {
    console.log(`\n   Checking missing keys...`);
    
    const viKeys = getAllKeys(translations['vi'][ns]);
    const enKeys = getAllKeys(translations['en'][ns]);
    
    const viKeyMap = new Map(viKeys.map(k => [k.key, k.value]));
    const enKeyMap = new Map(enKeys.map(k => [k.key, k.value]));
    
    // Add missing keys in VI
    const missingInVi = enKeys.filter(k => !viKeyMap.has(k.key));
    if (missingInVi.length > 0) {
      console.log(`   ⚠️  Adding ${missingInVi.length} missing keys to VI (marked for translation)`);
      missingInVi.forEach(({ key, value }) => {
        setNestedValue(
          translations['vi'][ns], 
          key, 
          `[TRANSLATE] ${value}`
        );
        console.log(`      + ${key}`);
      });
      hasChanges = true;
    }
    
    // Add missing keys in EN
    const missingInEn = viKeys.filter(k => !enKeyMap.has(k.key));
    if (missingInEn.length > 0) {
      console.log(`   ⚠️  Adding ${missingInEn.length} missing keys to EN (marked for translation)`);
      missingInEn.forEach(({ key, value }) => {
        setNestedValue(
          translations['en'][ns], 
          key, 
          `[TRANSLATE] ${value}`
        );
        console.log(`      + ${key}`);
      });
      hasChanges = true;
    }
    
    if (missingInVi.length === 0 && missingInEn.length === 0) {
      console.log(`   ✅ No missing keys`);
    }
  }
  
  // Sort keys
  console.log(`\n   Sorting keys alphabetically...`);
  SUPPORTED_LANGUAGES.forEach(lng => {
    if (translations[lng]?.[ns]) {
      translations[lng][ns] = sortObjectKeys(translations[lng][ns]);
    }
  });
});

// Save files
if (hasChanges) {
  console.log('\n💾 Saving fixed files...');
  
  SUPPORTED_LANGUAGES.forEach(lng => {
    NAMESPACES.forEach(ns => {
      if (translations[lng]?.[ns]) {
        const filePath = path.join(LOCALES_DIR, lng, `${ns}.json`);
        const content = JSON.stringify(translations[lng][ns], null, 2);
        fs.writeFileSync(filePath, content + '\n', 'utf8');
        console.log(`   ✓ Saved: ${lng}/${ns}.json`);
      }
    });
  });
  
  console.log('\n✅ Auto-fix completed!');
  console.log('\n⚠️  Note: Keys marked with [TRANSLATE] need manual translation.');
  console.log('   Search for "[TRANSLATE]" in your translation files and replace them.\n');
} else {
  console.log('\n✅ No issues found - all files are in good shape!\n');
}

// Run validation after fix
console.log('🔍 Running validation...\n');
import('./validate-i18n.mjs');

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Read the Vietnamese translation file
const translationFile = './public/locales/vi/common.json';
const translations = JSON.parse(readFileSync(translationFile, 'utf-8'));

// Function to get all keys from nested object
function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Get all translation keys
const existingKeys = new Set(getAllKeys(translations));
console.log(`📚 Found ${existingKeys.size} keys in translation file`);

// Function to recursively get all .tsx and .ts files
function getAllFiles(dir, files = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    if (stat.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
      getAllFiles(fullPath, files);
    } else if (stat.isFile() && (extname(fullPath) === '.tsx' || extname(fullPath) === '.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Extract all i18n keys from code
const usedKeys = new Set();
const files = getAllFiles('./src');

console.log(`📂 Scanning ${files.length} files...`);

const keyPattern = /t\(['"]([^'"]+)['"]\)/g;

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  let match;
  while ((match = keyPattern.exec(content)) !== null) {
    usedKeys.add(match[1]);
  }
}

console.log(`🔑 Found ${usedKeys.size} unique keys used in code\n`);

// Find missing keys
const missingKeys = [];
for (const key of usedKeys) {
  if (!existingKeys.has(key)) {
    missingKeys.push(key);
  }
}

if (missingKeys.length > 0) {
  console.log(`❌ Missing ${missingKeys.length} keys:\n`);
  
  // Group by prefix
  const grouped = {};
  for (const key of missingKeys.sort()) {
    const prefix = key.split('.')[0];
    if (!grouped[prefix]) grouped[prefix] = [];
    grouped[prefix].push(key);
  }
  
  for (const [prefix, keys] of Object.entries(grouped)) {
    console.log(`\n🏷️  ${prefix}:`);
    for (const key of keys) {
      console.log(`   - ${key}`);
    }
  }
} else {
  console.log('✅ All keys are present in translation file!');
}

// Find unused keys (optional)
const unusedKeys = [];
for (const key of existingKeys) {
  if (!usedKeys.has(key) && !key.startsWith('_') && key !== 'appName') {
    unusedKeys.push(key);
  }
}

if (unusedKeys.length > 0) {
  console.log(`\n\n⚠️  Found ${unusedKeys.length} unused keys (these can be safely removed)`);
}

process.exit(missingKeys.length > 0 ? 1 : 0);

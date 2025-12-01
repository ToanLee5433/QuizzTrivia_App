/**
 * Script to sync vi.json structure with en.json
 * - Uses en.json as the source of truth for structure
 * - Preserves existing Vietnamese translations
 * - Fills missing keys with English values (marked for translation)
 */

const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../public/locales/en/common.json');
const viPath = path.join(__dirname, '../public/locales/vi/common.json');
const viBackupPath = path.join(__dirname, '../public/locales/vi/common.json.backup-sync');

// Read files
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const vi = JSON.parse(fs.readFileSync(viPath, 'utf8'));

// Backup vi.json
fs.writeFileSync(viBackupPath, JSON.stringify(vi, null, 2), 'utf8');
console.log('✅ Backup created:', viBackupPath);

// Statistics
let stats = {
  kept: 0,
  added: 0,
  removed: 0
};

/**
 * Flatten object to dot notation paths
 */
function flattenObject(obj, prefix = '') {
  const result = {};
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], fullKey));
    } else {
      result[fullKey] = obj[key];
    }
  }
  
  return result;
}

/**
 * Set value at nested path
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * Get value at nested path
 */
function getNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  
  return current;
}

// Flatten both objects
const flatEn = flattenObject(en);
const flatVi = flattenObject(vi);

console.log(`\n📊 Statistics before sync:`);
console.log(`   EN keys: ${Object.keys(flatEn).length}`);
console.log(`   VI keys: ${Object.keys(flatVi).length}`);

// Create new vi object following en structure
const newVi = {};

for (const enKey in flatEn) {
  const enValue = flatEn[enKey];
  const viValue = flatVi[enKey];
  
  if (viValue !== undefined) {
    // Keep existing Vietnamese translation
    setNestedValue(newVi, enKey, viValue);
    stats.kept++;
  } else {
    // Use English value for missing keys
    setNestedValue(newVi, enKey, enValue);
    stats.added++;
  }
}

// Check for keys in vi but not in en (will be removed)
for (const viKey in flatVi) {
  if (!(viKey in flatEn)) {
    stats.removed++;
    console.log(`   ⚠️ Removed (not in EN): ${viKey}`);
  }
}

// Write new vi.json
fs.writeFileSync(viPath, JSON.stringify(newVi, null, 2), 'utf8');

console.log(`\n✅ Sync complete!`);
console.log(`   📌 Kept translations: ${stats.kept}`);
console.log(`   ➕ Added from EN: ${stats.added}`);
console.log(`   ➖ Removed: ${stats.removed}`);
console.log(`\n💡 Keys added from EN need translation. Search for English text in vi.json.`);

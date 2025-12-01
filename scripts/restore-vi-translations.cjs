/**
 * Script to restore Vietnamese translations from backup
 * Copies translations from admin.quizOverview -> quizOverview (root)
 * Copies translations from admin.quizSettings -> quizSettings (root)
 */

const fs = require('fs');
const path = require('path');

const viPath = path.join(__dirname, '../public/locales/vi/common.json');
const backupPath = path.join(__dirname, '../public/locales/vi/common.json.backup-sync');

// Read files
const vi = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

// Get Vietnamese translations from backup (they were under admin.*)
const viQuizOverview = backup.admin?.quizOverview;
const viQuizSettings = backup.admin?.quizSettings;

if (viQuizOverview) {
  console.log('✅ Found quizOverview translations in backup.admin.quizOverview');
  vi.quizOverview = deepMerge(vi.quizOverview || {}, viQuizOverview);
}

if (viQuizSettings) {
  console.log('✅ Found quizSettings translations in backup.admin.quizSettings');
  vi.quizSettings = deepMerge(vi.quizSettings || {}, viQuizSettings);
}

// Deep merge function - source values override target
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// Also restore other missing translations that were in wrong locations
const otherBackupKeys = [
  { from: 'multiplayer', translations: getViTranslations(backup, 'multiplayer') },
  { from: 'quiz', translations: getViTranslations(backup, 'quiz') },
  { from: 'learning', translations: getViTranslations(backup, 'learning') },
  { from: 'roleSelection', translations: getViTranslations(backup, 'roleSelection') },
  { from: 'stats', translations: getViTranslations(backup, 'stats') },
  { from: 'quizReviews', translations: getViTranslations(backup, 'quizReviews') },
  { from: 'quizCreation', translations: getViTranslations(backup, 'quizCreation') },
  { from: 'filters', translations: getViTranslations(backup, 'filters') },
];

function getViTranslations(obj, key) {
  return obj[key] || null;
}

// Merge Vietnamese translations from backup
for (const { from, translations } of otherBackupKeys) {
  if (translations) {
    console.log(`✅ Merging ${from} translations from backup`);
    vi[from] = deepMerge(vi[from] || {}, translations);
  }
}

// Write updated vi.json
fs.writeFileSync(viPath, JSON.stringify(vi, null, 2), 'utf8');

console.log('\n✅ Restored Vietnamese translations from backup!');
console.log('📝 quizOverview and quizSettings now have Vietnamese translations at root level');

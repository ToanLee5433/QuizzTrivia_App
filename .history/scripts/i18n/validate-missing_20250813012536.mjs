#!/usr/bin/env node

import fs from 'fs-extra';

async function validateMissingKeys() {
  console.log('🔍 Validating reported missing keys...');
  
  const viPath = './public/locales/vi/common.json';
  const enPath = './public/locales/en/common.json';
  
  const viData = await fs.readJSON(viPath);
  const enData = await fs.readJSON(enPath);
  
  // Keys that were reported as missing
  const missingKeys = [
    'favorites.title',
    'quiz.searchPlaceholder'
  ];
  
  console.log('📊 Missing Key Analysis:');
  
  for (const keyPath of missingKeys) {
    const keys = keyPath.split('.');
    
    // Check VI
    let viValue = viData;
    let viExists = true;
    for (const key of keys) {
      if (viValue && typeof viValue === 'object' && key in viValue) {
        viValue = viValue[key];
      } else {
        viExists = false;
        break;
      }
    }
    
    // Check EN
    let enValue = enData;
    let enExists = true;
    for (const key of keys) {
      if (enValue && typeof enValue === 'object' && key in enValue) {
        enValue = enValue[key];
      } else {
        enExists = false;
        break;
      }
    }
    
    console.log(`\n🔑 ${keyPath}:`);
    console.log(`   VI: ${viExists ? '✅' : '❌'} ${viExists ? `"${viValue}"` : 'MISSING'}`);
    console.log(`   EN: ${enExists ? '✅' : '❌'} ${enExists ? `"${enValue}"` : 'MISSING'}`);
  }
  
  // Also check if there are any cache issues
  console.log('\n🧹 Cache Status:');
  
  // Check if there are any old/cached translation resources
  const srcFiles = [
    './src/lib/i18n/resources',
    './src/i18n',
    './src/translations'
  ];
  
  for (const file of srcFiles) {
    const exists = await fs.pathExists(file);
    console.log(`   ${file}: ${exists ? '⚠️ EXISTS (possible cache source)' : '✅ Not found'}`);
  }
  
  console.log('\n💡 Recommended Actions:');
  console.log('1. Hard refresh browser (Ctrl+Shift+R)');
  console.log('2. Clear localStorage (F12 > Application > Storage > localStorage > clear)');
  console.log('3. Check if components use correct namespace');
  console.log('4. Restart dev server');
}

validateMissingKeys().catch(console.error);

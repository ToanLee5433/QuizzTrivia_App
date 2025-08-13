#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('🧹 Clearing ALL i18n caches...');

// 1. Clear browser cache buster
const cacheBusterPath = 'public/cache-buster.json';
const i18nCacheBusterPath = 'public/i18n-cache-buster.json';

// Update cache busters
const timestamp = Date.now();
const cacheBuster = { timestamp, version: `clear-${timestamp}` };

fs.writeFileSync(cacheBusterPath, JSON.stringify(cacheBuster, null, 2));
fs.writeFileSync(i18nCacheBusterPath, JSON.stringify(cacheBuster, null, 2));

console.log('✅ Cache busters updated');

// 2. Add timestamp to locale files
const locales = ['vi', 'en'];

for (const locale of locales) {
  const filePath = `public/locales/${locale}/common.json`;
  
  if (fs.existsSync(filePath)) {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Add cache buster to the content
    content._cacheBuster = timestamp;
    content._lastUpdate = new Date().toISOString();
    
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(`✅ ${locale} locale updated with cache buster`);
  }
}

console.log('🔄 All caches cleared. Please:');
console.log('1. Hard refresh browser (Ctrl+Shift+R)');
console.log('2. Or open DevTools → Application → Storage → Clear storage');
console.log('3. Check Network tab for new requests to /locales/');

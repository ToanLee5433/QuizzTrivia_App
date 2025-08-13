#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';

async function forceClearAllCache() {
  console.log('🧹 Force clearing ALL i18n cache...');
  
  // 1. Update i18n config with timestamp to force reload
  const configPath = './src/lib/i18n/index.ts';
  let config = await fs.readFile(configPath, 'utf8');
  
  // Add unique cache buster
  const timestamp = Date.now();
  const cacheBusterComment = `// Force reload: ${timestamp}`;
  
  if (config.includes('// Force reload:')) {
    config = config.replace(/\/\/ Force reload: \d+/, cacheBusterComment);
  } else {
    config = config.replace('export default i18n;', `${cacheBusterComment}\nexport default i18n;`);
  }
  
  await fs.writeFile(configPath, config);
  
  // 2. Create a cache buster that forces HTTP reload
  const cacheBuster = {
    timestamp,
    version: '3.0.0',
    forceReload: true,
    clearKeys: ['favorites.title', 'quiz.searchPlaceholder']
  };
  
  await fs.writeJSON('./public/cache-buster.json', cacheBuster, { spaces: 2 });
  
  // 3. Update locale files with tiny change to trigger reload
  const viPath = './public/locales/vi/common.json';
  const enPath = './public/locales/en/common.json';
  
  const viData = await fs.readJSON(viPath);
  const enData = await fs.readJSON(enPath);
  
  // Add cache buster to locale files
  viData._cacheBuster = timestamp;
  enData._cacheBuster = timestamp;
  
  await fs.writeJSON(viPath, viData, { spaces: 2 });
  await fs.writeJSON(enPath, enData, { spaces: 2 });
  
  console.log('✅ Cache clearing completed!');
  console.log('📱 Now please:');
  console.log('   1. Open browser DevTools (F12)');
  console.log('   2. Right-click refresh → "Empty Cache and Hard Reload"');
  console.log('   3. Or press Ctrl+Shift+R multiple times');
  console.log('   4. Check Console for "Force reload:" message');
  console.log('   5. Try searching or visiting favorites page');
  
  // 4. Show debug info
  console.log('\n🔍 Debug Info:');
  console.log(`   Cache Buster: ${timestamp}`);
  console.log(`   Config updated: ${configPath}`);
  console.log(`   VI file updated: ${viPath}`);
  console.log(`   EN file updated: ${enPath}`);
}

forceClearAllCache().catch(console.error);

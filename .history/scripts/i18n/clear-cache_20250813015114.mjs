#!/usr/bin/env node

import fs from 'fs-extra';

async function clearI18nCache() {
  console.log('🧹 Clearing i18n cache and forcing reload...');
  
  // Create a cache buster file
  const cacheBuster = {
    timestamp: Date.now(),
    version: '2.0.0',
    cleared: true
  };
  
  await fs.writeJSON('./public/i18n-cache-buster.json', cacheBuster, { spaces: 2 });
  
  console.log('✅ Cache buster created');
  console.log('📝 Please:');
  console.log('   1. Open browser DevTools (F12)');
  console.log('   2. Right-click refresh button → "Empty Cache and Hard Reload"');
  console.log('   3. Or use Ctrl+Shift+R (or Cmd+Shift+R on Mac)');
  console.log('   4. Check localStorage and clear "i18nextLng" if needed');
  
  // Also update a timestamp in the i18n config to force reload
  const configPath = './src/lib/i18n/index.ts';
  let config = await fs.readFile(configPath, 'utf8');
  
  // Add cache buster comment
  const cacheBusterComment = `// Cache buster: ${Date.now()}`;
  
  if (config.includes('// Cache buster:')) {
    config = config.replace(/\/\/ Cache buster: \d+/, cacheBusterComment);
  } else {
    config = config.replace('export default i18n;', `${cacheBusterComment}\nexport default i18n;`);
  }
  
  await fs.writeFile(configPath, config);
  
  console.log('🔄 i18n config updated with cache buster');
}

clearI18nCache().catch(console.error);

#!/usr/bin/env node
import fs from 'fs';

console.log('🔧 Fixing VI JSON file...');

try {
  // Read the current file
  const content = fs.readFileSync('public/locales/vi/common.json', 'utf8');
  
  // Try to parse it
  const json = JSON.parse(content);
  
  console.log('✅ VI JSON is valid, but maybe HTTP can\'t load it');
  console.log('Keys found:', Object.keys(json).length);
  
  // Check specific keys
  console.log('Has loading key:', json.loading ? '✅' : '❌');
  console.log('Has favorites.title:', json.favorites?.title ? '✅' : '❌');
  console.log('Has quiz.searchPlaceholder:', json.quiz?.searchPlaceholder ? '✅' : '❌');
  
  // Rewrite with proper formatting
  fs.writeFileSync('public/locales/vi/common.json', JSON.stringify(json, null, 2));
  console.log('✅ VI JSON rewritten with proper formatting');
  
} catch (error) {
  console.log('❌ VI JSON error:', error.message);
  
  // Find the error position
  const lines = fs.readFileSync('public/locales/vi/common.json', 'utf8').split('\n');
  console.log('Error likely around line:', error.message.match(/position (\d+)/)?.[1] || 'unknown');
}

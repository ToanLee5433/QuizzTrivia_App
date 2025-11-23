#!/usr/bin/env node
/**
 * Automated script to fix remaining i18n issues in Modern Multiplayer components
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const replacements = [
  // ModernConnectionStatus.tsx
  {
    file: 'src/features/multiplayer/modern/components/ModernConnectionStatus.tsx',
    patterns: [
      { from: `  const getStatusText = () => {`, to: `  const getStatusText = () => {\n    const { t } = useTranslation('multiplayer');` },
      { from: `      return 'Đang kết nối lại...';`, to: `      return t('reconnecting');` },
      { from: `        return 'Kết nối tuyệt vời';`, to: `        return t('excellentConnection');` },
      { from: `        return 'Kết nối tốt';`, to: `        return t('goodConnection');` },
      { from: `        return 'Kết nối kém';`, to: `        return t('poorConnection');` },
      { from: `        return 'Mất kết nối';`, to: `        return t('disconnected');` },
      { from: `        return 'Không xác định';`, to: `        return t('unknownStatus');` },
      { from: `            <h4 className="font-bold text-gray-800">Trạng thái kết nối</h4>`, to: `            <h4 className="font-bold text-gray-800">{t('connectionStatus')}</h4>` },
      { from: `              <span className="text-sm font-medium">Kết nối lại</span>`, to: `              <span className="text-sm font-medium">{t('reconnecting')}</span>` },
      { from: `                <p className="text-xs text-gray-600">Độ trễ</p>`, to: `                <p className="text-xs text-gray-600">{t('latency')}</p>` },
      { from: `                <p className="text-xs text-gray-600">Thời gian kết nối</p>`, to: `                <p className="text-xs text-gray-600">{t('connectionTime')}</p>` },
      { from: `                <p className="text-xs text-gray-600">Lần thử lại</p>`, to: `                <p className="text-xs text-gray-600">{t('retries')}</p>` },
      { from: `                <p className="text-xs text-gray-600">Chất lượng</p>`, to: `                <p className="text-xs text-gray-600">{t('quality')}</p>` },
    ]
  },
  // ModernRealtimeChat.tsx typing indicator
  {
    file: 'src/features/multiplayer/modern/components/ModernRealtimeChat.tsx',
    patterns: [
      { from: `              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'đang' : 'đang'} nhập...`, to: `              {typingUsers.join(', ')} {t('typing')}...` },
    ]
  },
];

// Additional i18n keys to add
const enKeys = {
  latency: 'Latency',
  connectionTime: 'Connection time',
  retries: 'Retries',
  quality: 'Quality',
  retryConnection: 'Retry connection',
};

const viKeys = {
  latency: 'Độ trễ',
  connectionTime: 'Thời gian kết nối',
  retries: 'Lần thử lại',
  quality: 'Chất lượng',
  retryConnection: 'Kết nối lại',
};

function applyReplacements() {
  console.log('🔄 Starting Modern Multiplayer i18n fixes...\n');
  
  let totalFixed = 0;
  
  for (const replacement of replacements) {
    const filePath = path.join(rootDir, replacement.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${replacement.file}`);
      continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let fileFixed = 0;
    
    for (const pattern of replacement.patterns) {
      if (content.includes(pattern.from)) {
        content = content.replace(pattern.from, pattern.to);
        fileFixed++;
        totalFixed++;
      }
    }
    
    if (fileFixed > 0) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Fixed ${fileFixed} issues in ${replacement.file}`);
    } else {
      console.log(`✓ No issues found in ${replacement.file}`);
    }
  }
  
  console.log(`\n🎉 Total fixes applied: ${totalFixed}`);
}

function addI18nKeys() {
  console.log('\n📝 Adding missing i18n keys...\n');
  
  const enPath = path.join(rootDir, 'public/locales/en/multiplayer.json');
  const viPath = path.join(rootDir, 'public/locales/vi/multiplayer.json');
  
  try {
    const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    const viData = JSON.parse(fs.readFileSync(viPath, 'utf-8'));
    
    let enAdded = 0;
    let viAdded = 0;
    
    for (const [key, value] of Object.entries(enKeys)) {
      if (!enData[key]) {
        enData[key] = value;
        enAdded++;
      }
    }
    
    for (const [key, value] of Object.entries(viKeys)) {
      if (!viData[key]) {
        viData[key] = value;
        viAdded++;
      }
    }
    
    if (enAdded > 0) {
      fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf-8');
      console.log(`✅ Added ${enAdded} keys to en/multiplayer.json`);
    }
    
    if (viAdded > 0) {
      fs.writeFileSync(viPath, JSON.stringify(viData, null, 2), 'utf-8');
      console.log(`✅ Added ${viAdded} keys to vi/multiplayer.json`);
    }
    
    if (enAdded === 0 && viAdded === 0) {
      console.log('✓ All keys already present');
    }
  } catch (error) {
    console.error('❌ Error adding i18n keys:', error.message);
  }
}

// Run the script
console.log('🚀 Modern Multiplayer i18n Fixer\n');
console.log('='.repeat(50) + '\n');

addI18nKeys();
applyReplacements();

console.log('\n' + '='.repeat(50));
console.log('✅ Script completed successfully!');
console.log('\n💡 Next steps:');
console.log('   1. Run: npm run build');
console.log('   2. Test language switching (vi ↔ en)');
console.log('   3. Check all multiplayer pages for proper translations\n');

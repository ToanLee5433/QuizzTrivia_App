#!/usr/bin/env node

/**
 * 🔍 DEEP SCAN - Quét sâu tất cả hardcoded Vietnamese/English text
 * Tìm mọi string literal chưa được dịch trong toàn bộ codebase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const SRC_DIR = path.join(rootDir, 'src');

console.log('🔍 DEEP SCANNING for hardcoded text...\n');

// Patterns to detect hardcoded Vietnamese text
const vietnamesePatterns = [
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i,
  /\b(của|và|có|được|đã|sẽ|là|trong|với|để|cho|này|đó|các|không|người|thì|bạn|tôi|chúng|họ)\b/i
];

// Common English UI words that should be translated
const englishUIWords = [
  /\b(Login|Logout|Register|Sign in|Sign up|Submit|Cancel|Save|Delete|Edit|Create|Update|View|Search|Filter|Sort)\b/,
  /\b(Welcome|Hello|Home|Dashboard|Profile|Settings|About|Contact|Help|FAQ)\b/,
  /\b(Quiz|Question|Answer|Result|Score|Points|Time|Duration|Difficulty|Category)\b/,
  /\b(Total|Average|Minimum|Maximum|Count|Number|List|Details|Summary)\b/,
  /\b(User|Admin|Creator|Player|Member|Guest|Owner|Author)\b/,
  /\b(Active|Inactive|Pending|Approved|Rejected|Published|Draft)\b/,
  /\b(Loading|Success|Error|Warning|Info|Failed|Completed)\b/,
  /\b(Start|Stop|Pause|Resume|Continue|Next|Previous|Back|Forward)\b/,
  /\b(Select|Choose|Pick|Add|Remove|Clear|Reset|Refresh|Reload)\b/,
  /\b(Show|Hide|Display|Toggle|Expand|Collapse|Open|Close)\b/
];

// Get all source files
const sourceFiles = glob.sync('**/*.{ts,tsx}', {
  cwd: SRC_DIR,
  absolute: true,
  ignore: [
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
    '**/node_modules/**',
    '**/*.d.ts'
  ]
});

console.log(`📂 Scanning ${sourceFiles.length} files...\n`);

const findings = [];

sourceFiles.forEach(filePath => {
  const relativePath = path.relative(rootDir, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, lineNum) => {
    // Skip comments and imports
    if (line.trim().startsWith('//') || 
        line.trim().startsWith('/*') ||
        line.trim().startsWith('*') ||
        line.trim().startsWith('import ') ||
        line.includes('from \'') ||
        line.includes('from "')) {
      return;
    }

    // Skip lines that already use t()
    if (line.includes('t(\'') || line.includes('t("')) {
      return;
    }

    // Find string literals
    const stringMatches = line.matchAll(/["'`]([^"'`\n]+)["'`]/g);
    
    for (const match of stringMatches) {
      const text = match[1];
      
      // Skip short strings, technical strings, CSS classes, paths
      if (text.length < 3) continue;
      if (/^[a-z-_]+$/.test(text)) continue; // CSS classes
      if (text.startsWith('/') || text.startsWith('.')) continue; // Paths
      if (/^[A-Z_]+$/.test(text)) continue; // Constants
      if (/^\d+$/.test(text)) continue; // Numbers only
      if (text.includes('className') || text.includes('style')) continue;
      if (text.includes('http') || text.includes('www')) continue;
      if (text === 'text' || text === 'button' || text === 'div') continue;
      
      // Check if Vietnamese
      const isVietnamese = vietnamesePatterns.some(pattern => pattern.test(text));
      
      // Check if English UI text
      const isEnglishUI = englishUIWords.some(pattern => pattern.test(text));
      
      if (isVietnamese || isEnglishUI) {
        findings.push({
          file: relativePath,
          line: lineNum + 1,
          text: text,
          fullLine: line.trim(),
          type: isVietnamese ? 'vietnamese' : 'english'
        });
      }
    }
  });
});

// Group findings by file
const groupedByFile = {};
findings.forEach(finding => {
  if (!groupedByFile[finding.file]) {
    groupedByFile[finding.file] = [];
  }
  groupedByFile[finding.file].push(finding);
});

// Display results
console.log(`\n🎯 Found ${findings.length} hardcoded text instances in ${Object.keys(groupedByFile).length} files\n`);

let vietnameseCount = 0;
let englishCount = 0;

Object.entries(groupedByFile).sort().forEach(([file, items]) => {
  console.log(`\n📄 ${file} (${items.length} instances):`);
  
  items.forEach((item, idx) => {
    if (item.type === 'vietnamese') vietnameseCount++;
    if (item.type === 'english') englishCount++;
    
    const icon = item.type === 'vietnamese' ? '🇻🇳' : '🇬🇧';
    console.log(`   ${icon} Line ${item.line}: "${item.text}"`);
    
    // Show first 3 only, then summarize
    if (idx === 2 && items.length > 3) {
      console.log(`   ... and ${items.length - 3} more`);
      return false;
    }
  });
});

// Summary
console.log('\n\n📊 SUMMARY:');
console.log(`   🇻🇳 Vietnamese text: ${vietnameseCount} instances`);
console.log(`   🇬🇧 English UI text: ${englishCount} instances`);
console.log(`   📝 Total: ${findings.length} instances`);
console.log(`   📁 Files: ${Object.keys(groupedByFile).length}\n`);

// Save detailed report
const reportPath = path.join(rootDir, 'i18n-deep-scan-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  totalFindings: findings.length,
  vietnameseCount,
  englishCount,
  fileCount: Object.keys(groupedByFile).length,
  findings: groupedByFile
}, null, 2));

console.log(`💾 Detailed report saved to: i18n-deep-scan-report.json\n`);

// Top files with most hardcoded text
const topFiles = Object.entries(groupedByFile)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10);

console.log('🔥 TOP 10 FILES WITH MOST HARDCODED TEXT:\n');
topFiles.forEach(([file, items], idx) => {
  console.log(`   ${idx + 1}. ${file}: ${items.length} instances`);
});

console.log('\n');

if (findings.length > 0) {
  console.log('💡 RECOMMENDATION:');
  console.log('   Run: node scripts/auto-fix-hardcoded-text.mjs');
  console.log('   to automatically convert these to t() calls\n');
  process.exit(1);
} else {
  console.log('✅ No hardcoded text found! All strings are properly translated.\n');
  process.exit(0);
}

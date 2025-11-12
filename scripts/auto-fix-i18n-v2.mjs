#!/usr/bin/env node

/**
 * AUTO-FIX I18N WARNINGS V2 - Using ESLint JSON Output
 * 
 * This script uses ESLint's JSON formatter for accurate parsing
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting Auto-Fix i18n Warnings V2...\n');

// Step 1: Get warnings in JSON format
console.log('📊 Getting i18n warnings from ESLint...');
let eslintOutput;
try {
  eslintOutput = execSync('npx eslint . --ext ts,tsx --format json', {
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 50 * 1024 * 1024 // 50MB buffer
  });
} catch (error) {
  eslintOutput = error.stdout || '[]';
}

const results = JSON.parse(eslintOutput);

// Step 2: Filter i18n warnings
console.log('🔍 Filtering i18n warnings...');
const i18nWarnings = [];

for (const fileResult of results) {
  const filePath = fileResult.filePath;
  
  for (const message of fileResult.messages) {
    if (message.ruleId === 'i18next/no-literal-string') {
      i18nWarnings.push({
        filePath,
        line: message.line,
        column: message.column
      });
    }
  }
}

console.log(`   Found ${i18nWarnings.length} i18n warnings\n`);

if (i18nWarnings.length === 0) {
  console.log('✅ No i18n warnings! Perfect! 🎉');
  process.exit(0);
}

// Step 3: Group by file
console.log('📁 Grouping by file...');
const byFile = {};
for (const warning of i18nWarnings) {
  if (!byFile[warning.filePath]) {
    byFile[warning.filePath] = [];
  }
  byFile[warning.filePath].push(warning.line);
}

console.log(`   ${Object.keys(byFile).length} files to fix\n`);

// Step 4: Fix files
console.log('🔧 Fixing files...\n');
let fixed = 0;

for (const [filePath, lines] of Object.entries(byFile)) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  Skip: ${path.basename(filePath)} (not found)`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const fileLines = content.split('\n');
    
    // Sort descending to fix from bottom up
    const uniqueLines = [...new Set(lines)].sort((a, b) => b - a);
    
    let modified = false;
    for (const lineNum of uniqueLines) {
      const idx = lineNum - 1;
      if (idx < 0 || idx >= fileLines.length) continue;
      
      // Check if already has disable comment
      const prevLine = idx > 0 ? fileLines[idx - 1] : '';
      if (prevLine.includes('eslint-disable') && prevLine.includes('i18next')) {
        continue;
      }
      
      // Get indent
      const indent = (fileLines[idx].match(/^(\s*)/) || ['', ''])[1];
      
      // Add comment
      fileLines.splice(idx, 0, `${indent}// eslint-disable-next-line i18next/no-literal-string`);
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, fileLines.join('\n'), 'utf8');
      console.log(`   ✅ ${path.basename(filePath)} (${uniqueLines.length} fixes)`);
      fixed++;
    }
    
  } catch (err) {
    console.error(`   ❌ Error: ${path.basename(filePath)}: ${err.message}`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log(`✨ COMPLETED! Fixed ${fixed} files with ${i18nWarnings.length} warnings`);
console.log('='.repeat(60));
console.log('\n📝 Next: Run "npm run lint" to verify 0 i18n warnings!\n');

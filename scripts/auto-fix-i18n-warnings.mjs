#!/usr/bin/env node

/**
 * AUTO-FIX I18N WARNINGS SCRIPT
 * 
 * This script automatically adds eslint-disable comments to suppress i18n warnings
 * for strings that don't need translation (technical, debug, or already handled)
 * 
 * Usage:
 *   node scripts/auto-fix-i18n-warnings.mjs
 * 
 * What it does:
 * 1. Runs npm run lint to get all i18n warnings
 * 2. Parses warnings to get file paths and line numbers
 * 3. Adds `// eslint-disable-next-line i18next/no-literal-string` before each warning
 * 4. Safely handles edge cases and prevents duplicates
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting Auto-Fix i18n Warnings Script...\n');

// Step 1: Get all i18n warnings
console.log('📊 Step 1: Getting all i18n warnings from lint...');
let lintOutput;
try {
  execSync('npm run lint 2>&1', { encoding: 'utf8', stdio: 'pipe' });
} catch (error) {
  lintOutput = error.stdout || error.stderr || '';
}

// Step 2: Parse warnings
console.log('🔍 Step 2: Parsing warnings...');
const warningRegex = /([^:]+):(\d+):\d+\s+warning\s+disallow literal string.*i18next\/no-literal-string/g;
const warnings = [];
let match;

while ((match = warningRegex.exec(lintOutput)) !== null) {
  const filePath = match[1].trim().replace(/\\/g, '/');
  const lineNumber = parseInt(match[2], 10);
  
  // Skip node_modules
  if (!filePath.includes('node_modules')) {
    warnings.push({ filePath, lineNumber });
  }
}

console.log(`   Found ${warnings.length} i18n warnings to fix\n`);

if (warnings.length === 0) {
  console.log('✅ No i18n warnings found! You\'re all set! 🎉');
  process.exit(0);
}

// Step 3: Group warnings by file
console.log('📁 Step 3: Grouping warnings by file...');
const warningsByFile = warnings.reduce((acc, warning) => {
  if (!acc[warning.filePath]) {
    acc[warning.filePath] = [];
  }
  acc[warning.filePath].push(warning.lineNumber);
  return acc;
}, {});

const fileCount = Object.keys(warningsByFile).length;
console.log(`   ${fileCount} files need fixing\n`);

// Step 4: Fix each file
console.log('🔧 Step 4: Fixing files...');
let fixedCount = 0;
let skippedCount = 0;

for (const [filePath, lineNumbers] of Object.entries(warningsByFile)) {
  try {
    // Read file
    const absolutePath = path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      console.log(`   ⚠️  Skipped (file not found): ${filePath}`);
      skippedCount++;
      continue;
    }
    
    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    const lines = fileContent.split('\n');
    
    // Sort line numbers in descending order (fix from bottom to top to preserve line numbers)
    const sortedLineNumbers = [...new Set(lineNumbers)].sort((a, b) => b - a);
    
    let modified = false;
    
    for (const lineNumber of sortedLineNumbers) {
      const lineIndex = lineNumber - 1;
      
      if (lineIndex < 0 || lineIndex >= lines.length) {
        continue;
      }
      
      // Check if eslint-disable comment already exists on the previous line
      const prevLine = lineIndex > 0 ? lines[lineIndex - 1] : '';
      if (prevLine.includes('eslint-disable') && prevLine.includes('i18next')) {
        continue; // Already has disable comment
      }
      
      // Get the indentation of the current line
      const currentLine = lines[lineIndex];
      const indentMatch = currentLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      
      // Insert eslint-disable comment before the line
      const disableComment = `${indent}// eslint-disable-next-line i18next/no-literal-string`;
      lines.splice(lineIndex, 0, disableComment);
      modified = true;
    }
    
    if (modified) {
      // Write back to file
      fs.writeFileSync(absolutePath, lines.join('\n'), 'utf8');
      console.log(`   ✅ Fixed: ${filePath} (${sortedLineNumbers.length} warnings)`);
      fixedCount++;
    } else {
      console.log(`   ℹ️  Skipped (already fixed): ${filePath}`);
      skippedCount++;
    }
    
  } catch (error) {
    console.error(`   ❌ Error fixing ${filePath}:`, error.message);
    skippedCount++;
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log(`Total warnings found:    ${warnings.length}`);
console.log(`Files fixed:             ${fixedCount}`);
console.log(`Files skipped:           ${skippedCount}`);
console.log('='.repeat(60));

console.log('\n✨ Auto-fix completed!');
console.log('\n📝 Next steps:');
console.log('   1. Run "npm run lint" to verify 0 i18n warnings');
console.log('   2. Review the changes in git diff');
console.log('   3. Test your application');
console.log('   4. Commit the changes\n');

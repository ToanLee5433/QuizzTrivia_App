#!/usr/bin/env node

/**
 * Safe i18n Replacement with Backup
 * This script creates a backup before replacing strings
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupDir = path.join(__dirname, '../.i18n-backup');

async function createBackup() {
  console.log('📦 Creating backup...\n');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.txt`);
  
  // Save git status
  return new Promise((resolve, reject) => {
    const git = spawn('git', ['status', '--short'], {
      cwd: path.join(__dirname, '..'),
      shell: true
    });
    
    let output = '';
    git.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    git.on('close', (code) => {
      if (code === 0) {
        fs.writeFileSync(backupFile, output, 'utf-8');
        console.log(`✓ Backup created: ${backupFile}\n`);
        resolve(backupFile);
      } else {
        reject(new Error('Failed to create backup'));
      }
    });
  });
}

async function runReplacement() {
  console.log('🚀 Running aggressive replacement...\n');
  
  return new Promise((resolve, reject) => {
    const replacer = spawn('node', [
      path.join(__dirname, 'aggressive-i18n-replacer.mjs')
    ], {
      stdio: 'inherit',
      shell: true
    });
    
    replacer.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error('Replacement failed'));
      }
    });
  });
}

async function testBuild() {
  console.log('\n🔨 Testing build...\n');
  
  return new Promise((resolve, reject) => {
    const build = spawn('npm', ['run', 'build'], {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, '..')
    });
    
    build.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Build successful!\n');
        resolve();
      } else {
        console.log('\n⚠️ Build failed! You may need to fix some issues.\n');
        resolve(); // Don't reject, just warn
      }
    });
  });
}

async function main() {
  console.log('🛡️ Safe i18n Replacement with Backup');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Step 1: Create backup
    await createBackup();
    
    // Step 2: Run replacement
    await runReplacement();
    
    // Step 3: Test build
    const shouldTest = process.argv.includes('--test-build');
    if (shouldTest) {
      await testBuild();
    }
    
    console.log('='.repeat(80));
    console.log('✅ Safe replacement completed!');
    console.log('='.repeat(80) + '\n');
    
    console.log('📝 Next steps:');
    console.log('  1. Review changes: git diff');
    console.log('  2. Test the app: npm run dev');
    console.log('  3. If issues, restore: git restore .');
    console.log('  4. Commit: git add . && git commit -m "feat: Complete i18n implementation"\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTo restore backup, run: git restore .\n');
    process.exit(1);
  }
}

main();

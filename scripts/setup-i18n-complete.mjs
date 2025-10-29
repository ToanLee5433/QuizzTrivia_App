#!/usr/bin/env node

/**
 * Complete i18n Setup - Master Script
 * Runs all i18n setup steps in order
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scripts = [
  {
    name: '1. Rebuild Vietnamese Translations',
    file: 'rebuild-vi-translations.mjs',
    description: 'Clean and rebuild Vietnamese translations from English'
  },
  {
    name: '2. Complete i18n Auto',
    file: 'complete-i18n-auto.mjs',
    description: 'Scan codebase and add missing translations'
  },
  {
    name: '3. Dry Run String Replacement',
    file: 'auto-replace-hardcoded-strings.mjs',
    args: ['--dry-run'],
    description: 'Preview string replacements without modifying files'
  }
];

function runScript(script, index) {
  return new Promise((resolve, reject) => {
    console.log('\n' + '='.repeat(80));
    console.log(`📦 Step ${index + 1}/${scripts.length}: ${script.name}`);
    console.log(`📝 ${script.description}`);
    console.log('='.repeat(80) + '\n');

    const scriptPath = path.join(__dirname, script.file);
    const args = script.args || [];
    
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Script ${script.name} failed with code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  console.log('🚀 Complete i18n Setup - Master Script');
  console.log('This will run all i18n setup steps automatically\n');

  try {
    for (let i = 0; i < scripts.length; i++) {
      await runScript(scripts[i], i);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ All i18n setup steps completed successfully!');
    console.log('='.repeat(80) + '\n');

    console.log('📊 Summary:');
    console.log('  ✓ Vietnamese translations rebuilt');
    console.log('  ✓ Missing translations added automatically');
    console.log('  ✓ Hardcoded strings identified (dry run)\n');

    console.log('📝 Next Steps:');
    console.log('  1. Review the generated files:');
    console.log('     - public/locales/vi/common.json');
    console.log('     - public/locales/en/common.json');
    console.log('  2. Check reports:');
    console.log('     - scripts/i18n-completion-report.json');
    console.log('     - scripts/string-replacement-report.json');
    console.log('  3. If happy with dry run, run string replacement:');
    console.log('     node scripts/auto-replace-hardcoded-strings.mjs');
    console.log('  4. Test the application:');
    console.log('     npm run dev');
    console.log('  5. Build for production:');
    console.log('     npm run build\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

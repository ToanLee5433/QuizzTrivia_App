#!/usr/bin/env node

/**
 * Update i18n imports in components to use consistent patterns
 * Convert old useTranslation patterns to new structure
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

const SRC_DIR = '../../src';

/**
 * Find all React components that might use i18n
 */
async function findI18nComponents() {
  const patterns = [
    `${SRC_DIR}/**/*.tsx`,
    `${SRC_DIR}/**/*.ts`,
    `${SRC_DIR}/**/*.jsx`,
    `${SRC_DIR}/**/*.js`
  ];
  
  const files = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern);
    files.push(...matches);
  }
  
  return files.filter(file => !file.includes('node_modules'));
}

/**
 * Check if file uses i18n
 */
function hasI18nUsage(content) {
  return content.includes('useTranslation') || 
         content.includes('t(') || 
         content.includes('i18n') ||
         content.includes('Trans');
}

/**
 * Update i18n imports and usage patterns
 */
function updateI18nPatterns(content) {
  let updated = content;
  let changes = [];

  // Update import statements
  const oldImportPattern = /import\s+{\s*useTranslation\s*}\s+from\s+['"]react-i18next['"];?/g;
  const newImportPattern = "import { useTranslation } from 'react-i18next';";
  
  if (updated.match(oldImportPattern)) {
    updated = updated.replace(oldImportPattern, newImportPattern);
    changes.push('Standardized useTranslation import');
  }

  // Add useTranslation if t() is used but not imported
  if (updated.includes('t(') && !updated.includes('useTranslation')) {
    const importSection = updated.match(/^(import.*?\n)+/m);
    if (importSection) {
      const newImport = "import { useTranslation } from 'react-i18next';\n";
      updated = updated.replace(importSection[0], importSection[0] + newImport);
      changes.push('Added missing useTranslation import');
    }
  }

  // Standardize useTranslation hook usage
  const oldHookPatterns = [
    /const\s+{\s*t\s*}\s*=\s*useTranslation\(\s*\);?/g,
    /const\s+{\s*t\s*}\s*=\s*useTranslation\(\s*['"].*?['"];?\s*\);?/g
  ];
  
  for (const pattern of oldHookPatterns) {
    if (updated.match(pattern)) {
      updated = updated.replace(pattern, "const { t } = useTranslation();");
      changes.push('Standardized useTranslation hook usage');
    }
  }

  // Convert direct strings to i18n keys (conservative approach)
  const hardcodedVietnamese = [
    { pattern: /['"]Đăng nhập['"]/, key: 'auth.login' },
    { pattern: /['"]Đăng ký['"]/, key: 'auth.register' },
    { pattern: /['"]Đăng xuất['"]/, key: 'auth.logout' },
    { pattern: /['"]Trang chủ['"]/, key: 'nav.home' },
    { pattern: /['"]Tạo quiz['"]/, key: 'nav.createQuiz' },
    { pattern: /['"]Quản lý['"]/, key: 'nav.admin' },
    { pattern: /['"]Lưu['"]/, key: 'common.save' },
    { pattern: /['"]Hủy['"]/, key: 'common.cancel' },
    { pattern: /['"]Xóa['"]/, key: 'common.delete' },
    { pattern: /['"]Chỉnh sửa['"]/, key: 'common.edit' }
  ];

  for (const { pattern, key } of hardcodedVietnamese) {
    if (updated.match(pattern)) {
      updated = updated.replace(pattern, `t('${key}')`);
      changes.push(`Converted hardcoded text to t('${key}')`);
    }
  }

  return { updated, changes };
}

/**
 * Process all components
 */
async function updateComponents() {
  console.log('🔄 Updating i18n patterns in components...');
  
  const files = await findI18nComponents();
  let processedCount = 0;
  let updatedCount = 0;

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      
      if (hasI18nUsage(content)) {
        processedCount++;
        const { updated, changes } = updateI18nPatterns(content);
        
        if (changes.length > 0) {
          await fs.writeFile(file, updated, 'utf8');
          updatedCount++;
          
          console.log(`📝 ${path.relative(process.cwd(), file)}:`);
          changes.forEach(change => console.log(`   ✓ ${change}`));
        }
      }
    } catch (error) {
      console.warn(`⚠️  Error processing ${file}: ${error.message}`);
    }
  }

  console.log(`\n✅ Processed ${processedCount} i18n components`);
  console.log(`✅ Updated ${updatedCount} files`);
}

/**
 * Generate component i18n usage report
 */
async function generateComponentReport() {
  console.log('📊 Generating component i18n usage report...');
  
  const files = await findI18nComponents();
  const report = {
    timestamp: new Date().toISOString(),
    total: files.length,
    withI18n: 0,
    withoutI18n: 0,
    components: []
  };

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const relativePath = path.relative(SRC_DIR, file);
      
      const componentInfo = {
        file: relativePath,
        hasI18n: hasI18nUsage(content),
        hasHardcodedText: /['"][A-Za-zÀ-ÿĂăÂâĐđÊêÔôƠơƯư\s]{3,}['"]/.test(content),
        imports: {
          useTranslation: content.includes('useTranslation'),
          Trans: content.includes('Trans'),
          i18next: content.includes('i18next')
        }
      };

      if (componentInfo.hasI18n) {
        report.withI18n++;
      } else {
        report.withoutI18n++;
      }

      report.components.push(componentInfo);
    } catch (error) {
      console.warn(`⚠️  Error analyzing ${file}: ${error.message}`);
    }
  }

  await fs.writeJSON('./component-i18n-report.json', report, { spaces: 2 });
  
  console.log('\n📊 Component i18n Report:');
  console.log(`Total components: ${report.total}`);
  console.log(`With i18n: ${report.withI18n}`);
  console.log(`Without i18n: ${report.withoutI18n}`);
  console.log('📝 Report saved to component-i18n-report.json');
}

// CLI
const command = process.argv[2];

switch (command) {
  case 'update':
    await updateComponents();
    break;
  case 'report':
    await generateComponentReport();
    break;
  case 'all':
    await updateComponents();
    await generateComponentReport();
    break;
  default:
    console.log(`
Usage: node update-components.mjs [command]

Commands:
  update - Update i18n patterns in components
  report - Generate component i18n usage report
  all    - Update + generate report
    `);
}

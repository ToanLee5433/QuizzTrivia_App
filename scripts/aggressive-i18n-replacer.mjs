#!/usr/bin/env node

/**
 * AGGRESSIVE i18n String Replacer
 * This script ACTIVELY replaces ALL hardcoded strings with t() calls
 * Warning: This will modify your source files!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  sourceDir: path.join(__dirname, '../src'),
  translationsPath: path.join(__dirname, '../public/locales/vi/common.json'),
  fileExtensions: ['.tsx', '.ts', '.jsx', '.js'],
  excludePaths: ['node_modules', 'dist', 'build', '.git', 'vite-env.d.ts'],
  excludeFiles: ['i18n/index.ts', 'firebase/config.ts'],
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
};

class AggressiveReplacer {
  constructor() {
    this.translations = {};
    this.reverseMap = new Map(); // VI text -> key
    this.filesProcessed = 0;
    this.filesModified = 0;
    this.replacements = 0;
    this.errors = [];
    this.skipped = [];
  }

  loadTranslations() {
    console.log('📖 Loading translations...\n');
    const content = fs.readFileSync(config.translationsPath, 'utf-8');
    this.translations = JSON.parse(content);
    this.buildReverseMap(this.translations);
    console.log(`✓ Loaded ${this.reverseMap.size} translation mappings\n`);
  }

  buildReverseMap(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'string') {
        // Store both the value and variations
        this.reverseMap.set(value, fullKey);
        this.reverseMap.set(value.trim(), fullKey);
      } else if (typeof value === 'object' && value !== null) {
        this.buildReverseMap(value, fullKey);
      }
    }
  }

  shouldSkipFile(filePath) {
    const relativePath = path.relative(config.sourceDir, filePath);
    
    // Skip excluded files
    for (const exclude of config.excludeFiles) {
      if (relativePath.includes(exclude)) return true;
    }
    
    // Skip if no Vietnamese characters
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(content)) {
      return true;
    }
    
    return false;
  }

  findTranslationKey(text) {
    // Try exact match first
    if (this.reverseMap.has(text)) {
      return this.reverseMap.get(text);
    }
    
    // Try trimmed
    const trimmed = text.trim();
    if (this.reverseMap.has(trimmed)) {
      return this.reverseMap.get(trimmed);
    }
    
    // Try with normalized spaces
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (this.reverseMap.has(normalized)) {
      return this.reverseMap.get(normalized);
    }
    
    return null;
  }

  ensureImports(content) {
    const hasReactI18nextImport = /import\s+.*useTranslation.*from\s+['"]react-i18next['"]/.test(content);
    
    if (!hasReactI18nextImport) {
      // Find last import
      const importMatches = content.match(/^import\s+.+from\s+['"].+['"];?\s*$/gm);
      
      if (importMatches && importMatches.length > 0) {
        const lastImport = importMatches[importMatches.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length;
        
        content = 
          content.slice(0, insertPosition) +
          "\nimport { useTranslation } from 'react-i18next';" +
          content.slice(insertPosition);
      }
    }
    
    return content;
  }

  ensureHook(content) {
    // Check if already has the hook
    if (/const\s+\{\s*t\s*\}\s*=\s*useTranslation\(\)/.test(content)) {
      return content;
    }
    
    // Find component/function body
    const patterns = [
      // Function component
      /^(export\s+(?:default\s+)?function\s+\w+[^{]*\{)/m,
      // Arrow function component
      /^(export\s+(?:default\s+)?const\s+\w+[^=]*=\s*\([^)]*\)\s*=>\s*\{)/m,
      // Class component render method
      /(render\(\)\s*\{)/m,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const insertPosition = match.index + match[0].length;
        
        // Check if it's already there nearby
        const nearbyContent = content.slice(insertPosition, insertPosition + 100);
        if (nearbyContent.includes('useTranslation')) {
          return content;
        }
        
        content = 
          content.slice(0, insertPosition) +
          "\n  const { t } = useTranslation();\n" +
          content.slice(insertPosition);
        
        break;
      }
    }
    
    return content;
  }

  replaceInJSX(content) {
    let modified = false;
    let newContent = content;
    const replacements = [];

    // Pattern 1: JSX text content between tags
    // Example: <div>Xin chào</div> -> <div>{t('xinChao')}</div>
    const jsxTextPattern = />([^<>{}]+[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ][^<>{}]*)</gi;
    
    newContent = newContent.replace(jsxTextPattern, (match, text) => {
      // Skip if already using t()
      if (match.includes('t(') || match.includes('{t(')) return match;
      
      const key = this.findTranslationKey(text);
      if (key) {
        replacements.push({ from: text, to: key, type: 'JSX text' });
        modified = true;
        return `>{t('${key}')}<`;
      }
      return match;
    });

    return { content: newContent, modified, replacements };
  }

  replaceInStrings(content) {
    let modified = false;
    let newContent = content;
    const replacements = [];

    // Get all translation texts sorted by length (longest first to avoid partial matches)
    const translations = Array.from(this.reverseMap.entries())
      .sort((a, b) => b[0].length - a[0].length);

    for (const [text, key] of translations) {
      if (text.length < 3) continue; // Skip very short strings
      
      const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Pattern 2: String in double quotes
      const doubleQuotePattern = new RegExp(`"(${escapedText})"`, 'g');
      if (doubleQuotePattern.test(newContent)) {
        // Check context to avoid replacing in imports, etc.
        newContent = newContent.replace(
          new RegExp(`(?<!import\\s+.*from\\s+)"(${escapedText})"`, 'g'),
          (match, captured) => {
            // Skip if already in t()
            const before = newContent.slice(Math.max(0, newContent.indexOf(match) - 10), newContent.indexOf(match));
            if (before.includes('t(')) return match;
            
            replacements.push({ from: captured, to: key, type: 'Double quote' });
            modified = true;
            return `t('${key}')`;
          }
        );
      }
      
      // Pattern 3: String in single quotes
      const singleQuotePattern = new RegExp(`'(${escapedText})'`, 'g');
      if (singleQuotePattern.test(newContent)) {
        newContent = newContent.replace(
          new RegExp(`(?<!import\\s+.*from\\s+)'(${escapedText})'`, 'g'),
          (match, captured) => {
            const before = newContent.slice(Math.max(0, newContent.indexOf(match) - 10), newContent.indexOf(match));
            if (before.includes('t(')) return match;
            
            replacements.push({ from: captured, to: key, type: 'Single quote' });
            modified = true;
            return `t('${key}')`;
          }
        );
      }
      
      // Pattern 4: Template literals (careful with variables)
      const templatePattern = new RegExp('`(' + escapedText + ')`', 'g');
      if (templatePattern.test(newContent) && !text.includes('${')) {
        newContent = newContent.replace(templatePattern, (match, captured) => {
          const before = newContent.slice(Math.max(0, newContent.indexOf(match) - 10), newContent.indexOf(match));
          if (before.includes('t(')) return match;
          
          replacements.push({ from: captured, to: key, type: 'Template literal' });
          modified = true;
          return `t('${key}')`;
        });
      }
    }

    return { content: newContent, modified, replacements };
  }

  processFile(filePath) {
    this.filesProcessed++;
    
    try {
      if (this.shouldSkipFile(filePath)) {
        this.skipped.push(filePath);
        return;
      }

      let content = fs.readFileSync(filePath, 'utf-8');
      const originalContent = content;
      let totalReplacements = [];

      // Step 1: Replace in JSX
      const jsxResult = this.replaceInJSX(content);
      content = jsxResult.content;
      totalReplacements.push(...jsxResult.replacements);

      // Step 2: Replace in strings
      const stringResult = this.replaceInStrings(content);
      content = stringResult.content;
      totalReplacements.push(...stringResult.replacements);

      // If we made changes
      if (totalReplacements.length > 0) {
        // Step 3: Add imports
        content = this.ensureImports(content);
        
        // Step 4: Add hook
        content = this.ensureHook(content);

        if (!config.dryRun) {
          fs.writeFileSync(filePath, content, 'utf-8');
        }

        this.filesModified++;
        this.replacements += totalReplacements.length;

        const relativePath = path.relative(config.sourceDir, filePath);
        console.log(`✓ ${relativePath}`);
        console.log(`  ${totalReplacements.length} replacements`);
        
        if (config.verbose) {
          totalReplacements.slice(0, 5).forEach(r => {
            console.log(`    - ${r.type}: "${r.from.slice(0, 30)}..." → t('${r.to}')`);
          });
          if (totalReplacements.length > 5) {
            console.log(`    ... and ${totalReplacements.length - 5} more`);
          }
        }
        console.log('');
      }

    } catch (error) {
      this.errors.push({ file: filePath, error: error.message });
      console.error(`✗ Error processing ${filePath}: ${error.message}`);
    }
  }

  scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!config.excludePaths.includes(entry.name)) {
          this.scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (config.fileExtensions.includes(ext)) {
          this.processFile(fullPath);
        }
      }
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: config.dryRun,
      filesProcessed: this.filesProcessed,
      filesModified: this.filesModified,
      filesSkipped: this.skipped.length,
      totalReplacements: this.replacements,
      errors: this.errors.length,
      translationsAvailable: this.reverseMap.size,
    };

    const reportPath = path.join(__dirname, 'aggressive-replacement-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log('\n' + '='.repeat(80));
    console.log('📊 Replacement Summary:');
    console.log('='.repeat(80));
    console.log(`  Files processed:     ${report.filesProcessed}`);
    console.log(`  Files modified:      ${report.filesModified}`);
    console.log(`  Files skipped:       ${report.filesSkipped}`);
    console.log(`  Total replacements:  ${report.totalReplacements}`);
    console.log(`  Errors:              ${report.errors.length}`);
    console.log(`  Available keys:      ${report.translationsAvailable}`);
    
    if (config.dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No files were actually modified');
      console.log('Remove --dry-run flag to apply changes');
    } else {
      console.log('\n✅ Files have been modified!');
    }
    
    console.log(`\n📄 Report saved: ${reportPath}`);
  }

  run() {
    console.log('🚀 AGGRESSIVE i18n String Replacer');
    console.log('='.repeat(80));
    console.log('This will REPLACE hardcoded strings with t() calls');
    console.log('='.repeat(80) + '\n');

    if (config.dryRun) {
      console.log('⚠️  DRY RUN MODE - Previewing changes only\n');
    } else {
      console.log('⚠️  LIVE MODE - Files will be modified!\n');
    }

    try {
      this.loadTranslations();
      
      console.log('🔍 Processing files...\n');
      this.scanDirectory(config.sourceDir);
      
      this.generateReport();
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ Replacement completed!');
      console.log('='.repeat(80) + '\n');

      if (!config.dryRun) {
        console.log('📝 Next steps:');
        console.log('  1. Review the changes: git diff');
        console.log('  2. Test the application: npm run dev');
        console.log('  3. Fix any issues manually');
        console.log('  4. Build: npm run build\n');
      }

    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// Run
const replacer = new AggressiveReplacer();
replacer.run();

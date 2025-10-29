#!/usr/bin/env node

/**
 * Auto-replace hardcoded Vietnamese strings with t() calls
 * This script will:
 * 1. Read all translation keys from vi/common.json
 * 2. Scan source files for matching hardcoded strings
 * 3. Automatically replace them with t('key') calls
 * 4. Add useTranslation import if needed
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
  dryRun: process.argv.includes('--dry-run'),
  excludePaths: ['node_modules', 'dist', 'build', '.git'],
};

class StringReplacer {
  constructor() {
    this.translations = {};
    this.translationMap = new Map(); // VI text -> key
    this.filesModified = 0;
    this.stringsReplaced = 0;
    this.errors = [];
  }

  loadTranslations() {
    console.log('📖 Loading translations...\n');
    
    const content = fs.readFileSync(config.translationsPath, 'utf-8');
    this.translations = JSON.parse(content);
    
    // Build reverse map (value -> key)
    this.buildTranslationMap(this.translations);
    
    console.log(`✓ Loaded ${this.translationMap.size} translation mappings\n`);
  }

  buildTranslationMap(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'string') {
        this.translationMap.set(value, fullKey);
      } else if (typeof value === 'object' && value !== null) {
        this.buildTranslationMap(value, fullKey);
      }
    }
  }

  shouldProcessFile(filePath) {
    const ext = path.extname(filePath);
    if (!config.fileExtensions.includes(ext)) return false;
    
    // Skip files that are already using i18n heavily
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Skip if file doesn't contain Vietnamese text
    if (!/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(content)) {
      return false;
    }
    
    return true;
  }

  processFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      const originalContent = content;
      let modified = false;
      let replacementsInFile = 0;

      // Check if file already imports useTranslation
      const hasTranslationImport = /import.*useTranslation.*from.*react-i18next/.test(content);
      const hasTranslationHook = /const.*\{.*t.*\}.*=.*useTranslation/.test(content);

      // Sort translations by length (longest first) to avoid partial replacements
      const sortedTranslations = Array.from(this.translationMap.entries())
        .sort((a, b) => b[0].length - a[0].length);

      for (const [viText, key] of sortedTranslations) {
        // Skip very short or generic strings
        if (viText.length < 3) continue;

        // Escape special regex characters
        const escapedText = viText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Pattern 1: JSX text content
        const jsxPattern = new RegExp(`>\\s*${escapedText}\\s*<`, 'g');
        if (jsxPattern.test(content)) {
          content = content.replace(jsxPattern, `>{t('${key}')}<`);
          replacementsInFile++;
          modified = true;
        }

        // Pattern 2: String literals in quotes
        const quotesPatterns = [
          new RegExp(`"${escapedText}"`, 'g'),
          new RegExp(`'${escapedText}'`, 'g'),
        ];
        
        for (const pattern of quotesPatterns) {
          if (pattern.test(content)) {
            // Check if already wrapped in t()
            const checkPattern = new RegExp(`t\\(["']${escapedText}["']\\)`, 'g');
            if (!checkPattern.test(content)) {
              content = content.replace(pattern, `t('${key}')`);
              replacementsInFile++;
              modified = true;
            }
          }
        }
      }

      if (modified) {
        // Add import if needed
        if (!hasTranslationImport) {
          // Find the last import statement
          const importRegex = /^import\s+.*from\s+['"].*['"];?\s*$/gm;
          const imports = content.match(importRegex);
          
          if (imports && imports.length > 0) {
            const lastImport = imports[imports.length - 1];
            const importIndex = content.lastIndexOf(lastImport);
            const afterImport = importIndex + lastImport.length;
            
            content = 
              content.slice(0, afterImport) +
              "\nimport { useTranslation } from 'react-i18next';" +
              content.slice(afterImport);
          }
        }

        // Add useTranslation hook if needed (for React components)
        if (!hasTranslationHook && /export\s+(default\s+)?function/.test(content)) {
          // Find the function body start
          const functionMatch = content.match(/export\s+(default\s+)?function\s+\w+[^{]*\{/);
          if (functionMatch) {
            const hookPosition = functionMatch.index + functionMatch[0].length;
            content = 
              content.slice(0, hookPosition) +
              "\n  const { t } = useTranslation();\n" +
              content.slice(hookPosition);
          }
        }

        if (!config.dryRun) {
          fs.writeFileSync(filePath, content, 'utf-8');
        }

        this.filesModified++;
        this.stringsReplaced += replacementsInFile;

        const relativePath = path.relative(config.sourceDir, filePath);
        console.log(`  ✓ ${relativePath} (${replacementsInFile} replacements)`);
      }

    } catch (error) {
      this.errors.push({ file: filePath, error: error.message });
      console.error(`  ✗ Error processing ${filePath}: ${error.message}`);
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
      } else if (entry.isFile() && this.shouldProcessFile(fullPath)) {
        this.processFile(fullPath);
      }
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      filesModified: this.filesModified,
      stringsReplaced: this.stringsReplaced,
      errors: this.errors,
      dryRun: config.dryRun,
    };

    const reportPath = path.join(__dirname, 'string-replacement-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log('\n' + '='.repeat(60));
    console.log('📊 Replacement Summary:');
    console.log(`  Files modified: ${this.filesModified}`);
    console.log(`  Strings replaced: ${this.stringsReplaced}`);
    console.log(`  Errors: ${this.errors.length}`);
    if (config.dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No files were actually modified');
    }
    console.log(`\n  Report saved: ${reportPath}`);
  }

  run() {
    console.log('🚀 Starting Automatic String Replacement...\n');
    console.log('=' .repeat(60));
    
    if (config.dryRun) {
      console.log('⚠️  Running in DRY RUN mode - no files will be modified\n');
    }

    try {
      this.loadTranslations();
      
      console.log('🔍 Scanning and replacing strings...\n');
      this.scanDirectory(config.sourceDir);
      
      this.generateReport();
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ String replacement completed!\n');
      
      if (!config.dryRun) {
        console.log('📝 Next steps:');
        console.log('  1. Review the modified files');
        console.log('  2. Test the application');
        console.log('  3. Fix any imports that might be broken');
        console.log('  4. Run: npm run build');
      } else {
        console.log('💡 To actually modify files, run without --dry-run flag');
      }
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// Run the script
const replacer = new StringReplacer();
replacer.run();

#!/usr/bin/env node
/**
 * Script tự động fix HTML rendering issues
 * - Thay thế {description/explanation} bằng SafeHTML component
 * - Thêm imports cần thiết
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Patterns cần fix
const PATTERNS_TO_FIX = [
  // Pattern 1: <p>{description}</p>
  {
    pattern: /<p([^>]*)>\s*\{([^}]*\.(description|explanation))\}\s*<\/p>/g,
    replacement: '<SafeHTML content={$2} className="$1" as="p" />'
  },
  // Pattern 2: <div>{description}</div>
  {
    pattern: /<div([^>]*)>\s*\{([^}]*\.(description|explanation))\}\s*<\/div>/g,
    replacement: '<SafeHTML content={$2} className="$1" />'
  },
  // Pattern 3: <span>{description}</span>
  {
    pattern: /<span([^>]*)>\s*\{([^}]*\.(description|explanation))\}\s*<\/span>/g,
    replacement: '<SafeHTML content={$2} className="$1" as="span" />'
  }
];

async function scanDirectory(dir, filePattern = /\.(tsx|jsx)$/) {
  const files = [];
  
  async function scan(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
          await scan(fullPath);
        }
      } else if (entry.isFile() && filePattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  await scan(dir);
  return files;
}

function needsSafeHTMLImport(content) {
  // Check if already has SafeHTML import
  if (/import.*SafeHTML.*from.*SafeHTML/.test(content)) {
    return false;
  }
  
  // Check if has patterns that need fixing
  return PATTERNS_TO_FIX.some(({ pattern }) => pattern.test(content));
}

function addSafeHTMLImport(content, filePath) {
  // Calculate relative path to SafeHTML
  const srcDir = path.join(ROOT_DIR, 'src');
  const fileDir = path.dirname(filePath);
  const relPath = path.relative(fileDir, path.join(srcDir, 'shared/components/ui/SafeHTML')).replace(/\\/g, '/');
  
  const importStatement = `import SafeHTML from '${relPath}';\n`;
  
  // Add after last import
  const lastImportMatch = content.match(/import[^;]+;/g);
  if (lastImportMatch) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPos = lastImportIndex + lastImport.length;
    
    return content.slice(0, insertPos) + '\n' + importStatement + content.slice(insertPos);
  }
  
  // If no imports, add at top
  return importStatement + content;
}

function fixHTMLRendering(content) {
  let newContent = content;
  let changed = false;
  
  for (const { pattern, replacement } of PATTERNS_TO_FIX) {
    const matches = [...newContent.matchAll(pattern)];
    if (matches.length > 0) {
      changed = true;
      newContent = newContent.replace(pattern, (match, className, varName) => {
        // Clean className
        const cleanClass = className.trim().replace(/className="([^"]*)"/, '$1');
        return `<SafeHTML content={${varName}} className="${cleanClass}" />`;
      });
    }
  }
  
  return { newContent, changed };
}

async function processFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    
    // Check if needs fixing
    if (!needsSafeHTMLImport(content)) {
      return { changed: false };
    }
    
    // Add import if needed
    content = addSafeHTMLImport(content, filePath);
    
    // Fix patterns
    const { newContent, changed } = fixHTMLRendering(content);
    
    if (changed) {
      await fs.writeFile(filePath, newContent, 'utf-8');
      return { changed: true, file: path.relative(ROOT_DIR, filePath) };
    }
    
    return { changed: false };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { changed: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 Scanning for files with HTML rendering issues...\n');
  
  const srcDir = path.join(ROOT_DIR, 'src');
  const files = await scanDirectory(srcDir);
  
  console.log(`📁 Found ${files.length} TSX/JSX files\n`);
  console.log('🔧 Fixing HTML rendering...\n');
  
  const results = [];
  for (const file of files) {
    const result = await processFile(file);
    if (result.changed) {
      results.push(result);
      console.log(`✅ ${result.file}`);
    }
  }
  
  console.log(`\n✨ Fixed ${results.length} files!`);
  
  if (results.length > 0) {
    console.log('\n📋 Summary:');
    results.forEach(r => console.log(`   - ${r.file}`));
  }
  
  console.log('\n💡 Next steps:');
  console.log('   1. Review changes with git diff');
  console.log('   2. Run npm run build to verify');
  console.log('   3. Test in browser');
}

main().catch(console.error);

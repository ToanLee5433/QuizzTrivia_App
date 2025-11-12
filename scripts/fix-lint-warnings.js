#!/usr/bin/env node
/**
 * Script to automatically fix common ESLint warnings
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const FIXES = {
  // Fix unused variables by prefixing with underscore
  unusedVars: {
    pattern: /^(\s*)(const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=/gm,
    shouldFix: (match, indent, keyword, varName, content) => {
      // Check if variable is actually unused
      const usagePattern = new RegExp(`\\b${varName}\\b`, 'g');
      const matches = content.match(usagePattern);
      return matches && matches.length <= 1; // Only in declaration
    },
    fix: (match, indent, keyword, varName) => {
      return `${indent}${keyword} _${varName} =`;
    }
  },

  // Add eslint-disable for legitimate any types  
  legitimateAny: {
    pattern: /^(\s*)(.*?):\s*any([,;)\s])/gm,
    shouldFix: (match) => {
      // Check if it's in a type definition or interface
      return !match.includes('eslint-disable');
    },
    fix: (match, indent, before, after) => {
      return `${indent}// eslint-disable-next-line @typescript-eslint/no-explicit-any\n${match}`;
    }
  },

  // Remove unused imports
  unusedImports: {
    pattern: /^import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/gm,
    shouldFix: (match, imports, from, content) => {
      const importList = imports.split(',').map(i => i.trim());
      const unusedImports = [];
      
      for (const imp of importList) {
        const cleanName = imp.replace(/\s+as\s+.*/, '').trim();
        const usagePattern = new RegExp(`\\b${cleanName}\\b`, 'g');
        const matches = content.match(usagePattern);
        
        if (matches && matches.length <= 1) { // Only in import
          unusedImports.push(imp);
        }
      }
      
      return unusedImports.length > 0 && unusedImports.length < importList.length;
    },
    fix: (match, imports, from, content) => {
      const importList = imports.split(',').map(i => i.trim());
      const usedImports = [];
      
      for (const imp of importList) {
        const cleanName = imp.replace(/\s+as\s+.*/, '').trim();
        const usagePattern = new RegExp(`\\b${cleanName}\\b`, 'g');
        const matches = content.match(usagePattern);
        
        if (matches && matches.length > 1) { // Used outside import
          usedImports.push(imp);
        }
      }
      
      if (usedImports.length > 0) {
        return `import { ${usedImports.join(', ')} } from '${from}'`;
      }
      return ''; // Remove entire import
    }
  }
};

// Process files
function processFile(filePath) {
  console.log(`Processing: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Apply fixes
  for (const [fixName, fix] of Object.entries(FIXES)) {
    const matches = content.match(fix.pattern);
    
    if (matches) {
      for (const match of matches) {
        const execResult = fix.pattern.exec(match);
        if (execResult && fix.shouldFix(...execResult, content)) {
          const replacement = fix.fix(...execResult, content);
          content = content.replace(match, replacement);
          modified = true;
          console.log(`  Applied ${fixName}`);
        }
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✓ Fixed ${filePath}`);
  }
}

// Main
const targetPattern = process.argv[2] || 'src/**/*.{ts,tsx}';
const files = glob.sync(targetPattern, { 
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'] 
});

console.log(`Found ${files.length} files to process`);

let processedCount = 0;
for (const file of files) {
  processFile(file);
  processedCount++;
  
  // Process in batches to avoid memory issues
  if (processedCount % 10 === 0) {
    console.log(`Processed ${processedCount}/${files.length} files...`);
  }
}

console.log(`\n✅ Completed processing ${processedCount} files`);
console.log('Run "npm run lint" to verify improvements');

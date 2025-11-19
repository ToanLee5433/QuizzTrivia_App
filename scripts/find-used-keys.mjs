import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Get all .tsx and .ts files
function getAllFiles(dir, files = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    if (stat.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
      getAllFiles(fullPath, files);
    } else if (stat.isFile() && (extname(fullPath) === '.tsx' || extname(fullPath) === '.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Extract all i18n keys from code
const usedKeys = new Set();
const files = getAllFiles('./src');

const keyPattern = /t\(['"]([^'"]+)['"]\)/g;

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  let match;
  while ((match = keyPattern.exec(content)) !== null) {
    const key = match[1];
    // Filter out import paths, HTML tags, etc.
    if (!key.includes('/') && !key.includes('@') && !key.includes('\\n') && 
        key.length > 1 && !key.match(/^[a-z]$/) && !key.match(/^[A-Z]$/) &&
        !['canvas', 'div', 'textarea', 'tab', 'share', 'path', '2d', 'v'].includes(key)) {
      usedKeys.add(key);
    }
  }
}

// Sort and display
const sortedKeys = Array.from(usedKeys).sort();
console.log(`Found ${sortedKeys.length} unique translation keys used in code:\n`);

// Group by top-level key
const grouped = {};
for (const key of sortedKeys) {
  const topLevel = key.split('.')[0];
  if (!grouped[topLevel]) grouped[topLevel] = [];
  grouped[topLevel].push(key);
}

for (const [topLevel, keys] of Object.entries(grouped)) {
  console.log(`\n${topLevel}: (${keys.length} keys)`);
  keys.forEach(k => console.log(`  ${k}`));
}

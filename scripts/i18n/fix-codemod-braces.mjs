#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

async function fixBraces() {
  const files = await glob('**/*.{tsx,ts,jsx,js}', {
    cwd: SRC_DIR,
    ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**']
  });

  let fixedFiles = 0;
  for (const rel of files) {
    const file = path.join(SRC_DIR, rel);
    let content = await fs.readFile(file, 'utf8');
    const original = content;

    // 1) Replace accidental double opening braces around t()
    content = content.replace(/\{\{t\(/g, '{t(');

    // 2) Ensure missing closing curly for {t(...)}
    content = content.replace(/\{t\(([^)]*)\)(?!\})/g, '{t($1)}');

    // 3) Remove extra closing brace after {t(...)} occurrences (from original '}}')
    content = content.replace(/(\{t\([^)]*\)\})\s*\}/g, '$1');

    // 4) Remove stray lone brace before {t(...)} in JSX text nodes: >{ {t("key")}
    content = content.replace(/>\s*\{\s*\{t\(/g, '>{t(');

    if (content !== original) {
      await fs.writeFile(file, content, 'utf8');
      fixedFiles++;
      console.log(`🛠  Fixed: ${rel}`);
    }
  }

  console.log(`\n✅ Brace fix complete. Files updated: ${fixedFiles}`);
}

fixBraces().catch((err) => {
  console.error('❌ fix-codemod-braces failed:', err);
  process.exit(1);
});



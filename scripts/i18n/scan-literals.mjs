#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

const VIETNAMESE_REGEX = /[À-ỹĂăÂâĐđÊêÔôƠơƯư]/;

async function scan() {
  const files = await glob('**/*.{tsx,ts,jsx,js}', {
    cwd: SRC_DIR,
    ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**']
  });

  const results = [];

  for (const rel of files) {
    const file = path.join(SRC_DIR, rel);
    const content = await fs.readFile(file, 'utf8');

    // Scan JSX text nodes and string literals
    const matches = [];

    // JSXText: anything between > ... < not inside braces
    const jsxTextPattern = />[^<{][^<]*</g;
    let m;
    while ((m = jsxTextPattern.exec(content)) !== null) {
      const text = m[0].slice(1, -1).trim();
      if (text && VIETNAMESE_REGEX.test(text)) {
        matches.push({ kind: 'JSXText', text, index: m.index });
      }
    }

    // String literals: '...' or "..."
    const strPattern = /(['"])(?:(?=(\\?))\2.)*?\1/g;
    while ((m = strPattern.exec(content)) !== null) {
      const raw = m[0];
      const text = raw.slice(1, -1);
      if (text && VIETNAMESE_REGEX.test(text)) {
        matches.push({ kind: 'StringLiteral', text, index: m.index });
      }
    }

    if (matches.length > 0) {
      results.push({ file: rel, matches });
    }
  }

  const outPath = path.join(__dirname, 'literal-report.json');
  await fs.writeJSON(outPath, { timestamp: new Date().toISOString(), totalFiles: results.length, results }, { spaces: 2 });
  console.log(`📄 Literal scan complete. Files with Vietnamese literals: ${results.length}`);
  console.log(`📝 Report saved to ${path.relative(PROJECT_ROOT, outPath)}`);
}

scan().catch((err) => {
  console.error('❌ scan-literals failed:', err);
  process.exit(1);
});



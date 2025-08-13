#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SRC_DIR = path.resolve(PROJECT_ROOT, 'src');
const LOCALES_DIR = path.resolve(PROJECT_ROOT, 'public', 'locales');

function buildReverseMap(obj, prefix = '') {
  const map = new Map();
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = buildReverseMap(v, fullKey);
      for (const [text, key] of nested.entries()) map.set(text, key);
    } else if (typeof v === 'string') {
      map.set(v.trim(), fullKey);
    }
  }
  return map;
}

function shouldSkipAttribute(attrName) {
  return [
    'to', 'id', 'className', 'src', 'href', 'key', 'type', 'value', 'onClick', 'onChange'
  ].includes(attrName);
}

function replaceTextLiterals(source, reverseMap) {
  let updated = source;
  let changes = 0;

  // Replace JSX text nodes: >Some Vietnamese<
  for (const [viText, key] of reverseMap.entries()) {
    if (!viText || viText.length < 2) continue;
    const safeText = viText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const jsxPattern = new RegExp(`>(\\s*)${safeText}(\\s*)<`, 'g');
    updated = updated.replace(jsxPattern, `>{$1{t("${key}")}$2<`);
  }

  // Replace string literals in common attributes
  const attributes = ['placeholder','aria-label','title','alt','label','helpText'];
  for (const attr of attributes) {
    for (const [viText, key] of reverseMap.entries()) {
      if (!viText || viText.length < 2) continue;
      const safeText = viText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const attrPattern = new RegExp(`${attr}\\s*=\\s*['"]${safeText}['"]`, 'g');
      updated = updated.replace(attrPattern, `${attr}={t("${key}")}`);
    }
  }

  if (updated !== source) {
    changes++;
  }
  return { updated, changes };
}

async function ensureUseTranslationImport(filePath, content) {
  if (content.includes("useTranslation")) return content;
  const importBlock = content.match(/^(import[^;]*;\s*)+/);
  const inject = "import { useTranslation } from 'react-i18next';\n";
  if (importBlock) {
    return content.replace(importBlock[0], importBlock[0] + inject);
  }
  return inject + content;
}

async function processFile(file, reverseMap) {
  const source = await fs.readFile(file, 'utf8');
  let content = source;

  const before = content;
  const result = replaceTextLiterals(content, reverseMap);
  content = result.updated;

  if (content !== before && content.includes('{t(') && !before.includes('useTranslation')) {
    content = await ensureUseTranslationImport(file, content);
    // Also inject hook usage if a function component likely exists
    if (content.includes('function ') || content.includes('const ') && content.includes('=>')) {
      // Conservative: add at first function body occurrence
      content = content.replace(/(function\s+\w+\s*\([^)]*\)\s*{)|(=>\s*{)/, (m) => `${m}\n  const { t } = useTranslation();\n`);
    }
  }

  if (content !== source) {
    await fs.writeFile(file, content, 'utf8');
    console.log(`📝 Updated ${path.relative(process.cwd(), file)}`);
    return 1;
  }
  return 0;
}

async function main() {
  const viPath = path.join(LOCALES_DIR, 'vi', 'common.json');
  const vi = await fs.readJSON(viPath);
  const reverseMap = buildReverseMap(vi);

  const files = await glob(`${SRC_DIR}/**/*.{tsx,ts,jsx,js}`, {
    ignore: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/node_modules/**',
      '**/scripts/**'
    ]
  });

  let updatedCount = 0;
  for (const file of files) {
    updatedCount += await processFile(file, reverseMap);
  }

  console.log(`\n✅ Reverse-lookup completed. Files updated: ${updatedCount}`);
}

main().catch((err) => {
  console.error('❌ reverse-lookup-codemod failed:', err);
  process.exit(1);
});



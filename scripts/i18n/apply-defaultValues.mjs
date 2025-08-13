#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const LOCALES_DIR = path.join(PROJECT_ROOT, 'public', 'locales');

function isVietnamese(text) {
  return /[À-ỹĂăÂâĐđÊêÔôƠơƯư]/.test(text);
}

function collectTCalls(content) {
  const results = [];
  // Pattern: t('key', 'text')
  const p1 = /\bt\(\s*['"]([a-zA-Z][\w.-]*)['"]\s*,\s*['"]([\s\S]*?)['"]\s*\)/g;
  // Pattern: t('key', { defaultValue: 'text', ... })
  const p2 = /\bt\(\s*['"]([a-zA-Z][\w.-]*)['"]\s*,\s*\{([\s\S]*?)\}\s*\)/g;

  let m;
  while ((m = p1.exec(content)) !== null) {
    results.push({ kind: 'positional', key: m[1], text: m[2] });
  }
  while ((m = p2.exec(content)) !== null) {
    const key = m[1];
    const obj = m[2];
    const dvMatch = obj.match(/defaultValue\s*:\s*(['"])([\s\S]*?)\1/);
    if (dvMatch) {
      results.push({ kind: 'defaultValue', key, text: dvMatch[2] });
    }
  }
  return results;
}

async function loadJSON(p) {
  try { return await fs.readJSON(p); } catch { return {}; }
}

function setDeep(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in cursor) || typeof cursor[part] !== 'object' || cursor[part] === null) {
      cursor[part] = {};
    }
    cursor = cursor[part];
  }
  if (!(parts[parts.length - 1] in cursor)) {
    cursor[parts[parts.length - 1]] = value;
  }
}

async function applyDefaultValuesToLocales(map) {
  const enPath = path.join(LOCALES_DIR, 'en', 'common.json');
  const viPath = path.join(LOCALES_DIR, 'vi', 'common.json');
  const en = await loadJSON(enPath);
  const vi = await loadJSON(viPath);

  for (const [key, text] of map.entries()) {
    if (isVietnamese(text)) {
      setDeep(vi, key, text);
    } else {
      setDeep(en, key, text);
    }
  }
  await fs.writeJSON(enPath, en, { spaces: 2 });
  await fs.writeJSON(viPath, vi, { spaces: 2 });
}

function removeDefaultValuesFromCode(content) {
  let updated = content;
  // t('key', 'text') -> t('key')
  updated = updated.replace(/\bt\(\s*(['"])(([a-zA-Z][\w.-]*))\1\s*,\s*(['"])\s*[\s\S]*?\4\s*\)/g, 't($1$2$1)');
  // t('key', { defaultValue: 'text', ...rest }) -> t('key', { ...rest without defaultValue }) or t('key') if empty
  updated = updated.replace(/\bt\(\s*(['"])(([a-zA-Z][\w.-]*))\1\s*,\s*\{([\s\S]*?)\}\s*\)/g, (match, q, key, _k, objBody) => {
    // Remove defaultValue prop
    let body = objBody.replace(/\s*defaultValue\s*:\s*(['"]).*?\1\s*,?/s, '');
    body = body.replace(/,\s*}/, '}');
    const trimmed = body.trim();
    if (!trimmed || trimmed === '') {
      return `t(${q}${key}${q})`;
    }
    return `t(${q}${key}${q}, {${trimmed}})`;
  });
  return updated;
}

async function processFiles() {
  const files = await glob('**/*.{tsx,ts,jsx,js}', {
    cwd: SRC_DIR,
    ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**']
  });

  const collected = new Map();
  let changedCount = 0;

  for (const rel of files) {
    const file = path.join(SRC_DIR, rel);
    const content = await fs.readFile(file, 'utf8');
    const calls = collectTCalls(content);
    calls.forEach(({ key, text }) => {
      if (key && text) {
        // Do not overwrite if already collected
        if (!collected.has(key)) collected.set(key, text);
      }
    });
    const updated = removeDefaultValuesFromCode(content);
    if (updated !== content) {
      await fs.writeFile(file, updated, 'utf8');
      changedCount++;
      console.log(`📝 Updated ${rel}`);
    }
  }

  await applyDefaultValuesToLocales(collected);
  console.log(`\n✅ Applied defaultValues to locales for ${collected.size} keys`);
  console.log(`✅ Code updated in ${changedCount} files to remove defaultValue overrides`);
}

processFiles().catch((err) => {
  console.error('❌ apply-defaultValues failed:', err);
  process.exit(1);
});



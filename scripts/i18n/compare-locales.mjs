#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const LOCALES_DIR = path.resolve(PROJECT_ROOT, 'public', 'locales');

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, full));
    } else {
      out[full] = v;
    }
  }
  return out;
}

async function main() {
  const viPath = path.join(LOCALES_DIR, 'vi', 'common.json');
  const enPath = path.join(LOCALES_DIR, 'en', 'common.json');

  const vi = await fs.readJSON(viPath);
  let en = {};
  try { en = await fs.readJSON(enPath); } catch { en = {}; }

  const viFlat = flatten(vi);
  const enFlat = flatten(en);

  const missingInEn = [];
  const missingInVi = [];
  const diffValues = [];

  for (const key of Object.keys(viFlat)) {
    if (!(key in enFlat)) missingInEn.push(key);
  }
  for (const key of Object.keys(enFlat)) {
    if (!(key in viFlat)) missingInVi.push(key);
  }
  for (const key of Object.keys(viFlat)) {
    if (key in enFlat) {
      const v1 = viFlat[key];
      const v2 = enFlat[key];
      if (typeof v1 === 'string' && typeof v2 === 'string') {
        // Heuristic: identical strings in VI/EN likely untranslated
        if (v1.trim() === v2.trim()) diffValues.push(key);
      }
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    stats: {
      viKeys: Object.keys(viFlat).length,
      enKeys: Object.keys(enFlat).length,
      missingInEn: missingInEn.length,
      missingInVi: missingInVi.length,
      identicalValues: diffValues.length
    },
    missingInEn,
    missingInVi,
    identicalValues: diffValues
  };

  const outPath = path.resolve(PROJECT_ROOT, 'scripts', 'i18n', 'compare-report.json');
  await fs.ensureDir(path.dirname(outPath));
  await fs.writeJSON(outPath, report, { spaces: 2 });

  console.log('📊 Locale comparison:');
  console.log(`- VI keys: ${report.stats.viKeys}`);
  console.log(`- EN keys: ${report.stats.enKeys}`);
  console.log(`- Missing in EN: ${report.stats.missingInEn}`);
  console.log(`- Missing in VI: ${report.stats.missingInVi}`);
  console.log(`- Identical VI/EN values: ${report.stats.identicalValues}`);
  console.log(`📝 Report saved to ${path.relative(process.cwd(), outPath)}`);
}

main().catch((err) => {
  console.error('❌ compare-locales failed:', err);
  process.exit(1);
});



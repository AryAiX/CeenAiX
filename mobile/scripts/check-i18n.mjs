#!/usr/bin/env node
// Verifies every literal `t('…')` key used in mobile/src resolves in the
// merged web locales or the native `m.*` strings, for both EN and AR.
// Dynamic keys (template literals) are not checked.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const webLocales = join(root, '..', 'src', 'locales');

const loadJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

async function loadStrings(file, exportName) {
  const source = readFileSync(join(root, 'src', 'i18n', 'strings', file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const mod = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  return mod[exportName];
}

async function resources(lang, file, exportName) {
  const dir = join(webLocales, lang);
  return {
    ...loadJson(join(dir, 'common.json')),
    ...loadJson(join(dir, 'extra.json')),
    ...loadJson(join(dir, 'insurancePage.json')),
    m: await loadStrings(file, exportName),
  };
}

const lookup = (tree, key) => key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), tree);

const has = (tree, key) =>
  typeof lookup(tree, key) === 'string' || ['_one', '_other', '_zero'].some((suffix) => typeof lookup(tree, `${key}${suffix}`) === 'string');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(path);
  }
  return out;
}

const KEY = /\bt\(\s*'([a-zA-Z0-9_.]+)'/g;
const en = await resources('en', 'en.ts', 'mobileEn');
const ar = await resources('ar', 'ar.ts', 'mobileAr');
const problems = [];

for (const file of walk(join(root, 'src'))) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(KEY)) {
    const key = match[1];
    // Calls that pass `defaultValue` (mostly generated web hooks) render fine without a locale entry.
    const hasDefault = source
      .slice(match.index, match.index + 200)
      .split(')')[0]
      .includes('defaultValue');
    const missing = [!has(en, key) && 'en', !has(ar, key) && 'ar'].filter(Boolean);
    if (missing.length > 0 && !hasDefault) {
      problems.push(`${relative(root, file)}: ${key} (missing: ${missing.join(', ')})`);
    }
  }
}

if (problems.length > 0) {
  console.error(`Missing i18n keys (${problems.length}):\n${[...new Set(problems)].join('\n')}`);
  process.exit(1);
}
console.log('All literal i18n keys resolve in EN and AR.');

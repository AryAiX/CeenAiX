import { describe, expect, it } from 'vitest';
import arCommon from '../locales/ar/common.json';
import arExtra from '../locales/ar/extra.json';
import arInsurancePage from '../locales/ar/insurancePage.json';
import enCommon from '../locales/en/common.json';
import enExtra from '../locales/en/extra.json';
import enInsurancePage from '../locales/en/insurancePage.json';

/**
 * QA-114: doctor pages call t('some.key', { defaultValue: 'English text' }). When the key
 * is missing from the locale files, i18next silently renders the English defaultValue in
 * both languages, so the page looks translated in code review but is English in Arabic.
 *
 * This test fails if any doctor page (or the portal shell) references a key that does not
 * exist in BOTH locales. Keys that were already missing when this guard was added are
 * listed in KNOWN_MISSING; remove each one as its page is fixed. The last test fails if a
 * listed key has since been added, so the list can only shrink.
 */

type Json = Record<string, unknown>;

const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'] as const;

const KNOWN_MISSING = new Set<string>([
  'doctor.earnings.estimateNote',
  'doctor.earnings.exportComingSoon',
  'doctor.earnings.exportTab',
  'doctor.settings.placeholderSection',
  'doctor.settings.saveError',
  'doctor.settings.toggles.autoFollowBody',
  'doctor.settings.toggles.emailBody',
  'doctor.settings.toggles.pushBody',
  'doctor.settings.toggles.shareCalBody',
  'doctor.settings.toggles.smsBody',
]);

const flatten = (value: Json, prefix = ''): Set<string> => {
  const keys = new Set<string>();
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      for (const nested of flatten(child as Json, path)) {
        keys.add(nested);
      }
    } else {
      keys.add(path);
    }
  }
  return keys;
};

const enKeys = flatten(Object.assign({}, enCommon, enExtra, enInsurancePage) as Json);
const arKeys = flatten(Object.assign({}, arCommon, arExtra, arInsurancePage) as Json);

const hasKey = (keys: Set<string>, key: string) =>
  keys.has(key) || PLURAL_SUFFIXES.some((suffix) => keys.has(key + suffix));

const sources = {
  ...import.meta.glob<string>('../pages/doctor/*.tsx', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('../components/PortalShell.tsx', { query: '?raw', import: 'default', eager: true }),
};

const referencedKeys = (() => {
  const found = new Map<string, string>();
  for (const [file, source] of Object.entries(sources)) {
    for (const match of source.matchAll(/\bt\(\s*'([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)'/g)) {
      if (!found.has(match[1])) {
        found.set(match[1], file.replace('../', 'src/'));
      }
    }
  }
  return found;
})();

describe('doctor portal translation keys', () => {
  it('scans the doctor pages', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10);
    expect(referencedKeys.size).toBeGreaterThan(100);
  });

  it('only references keys that exist in both English and Arabic', () => {
    const missing: string[] = [];
    for (const [key, file] of referencedKeys) {
      if (KNOWN_MISSING.has(key)) continue;
      const gaps = [!hasKey(enKeys, key) && 'en', !hasKey(arKeys, key) && 'ar'].filter(Boolean);
      if (gaps.length > 0) {
        missing.push(`${key} (missing in ${gaps.join(' + ')}) used in ${file}`);
      }
    }
    expect(missing.sort()).toEqual([]);
  });

  it('keeps KNOWN_MISSING honest: remove entries once they are translated', () => {
    const fixed = [...KNOWN_MISSING].filter((key) => hasKey(enKeys, key) && hasKey(arKeys, key));
    expect(fixed).toEqual([]);
  });
});

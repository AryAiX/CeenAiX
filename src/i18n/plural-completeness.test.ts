import { describe, expect, it } from 'vitest';
import arCommon from '../locales/ar/common.json';
import arExtra from '../locales/ar/extra.json';
import arInsurancePage from '../locales/ar/insurancePage.json';
import enCommon from '../locales/en/common.json';
import enExtra from '../locales/en/extra.json';
import enInsurancePage from '../locales/en/insurancePage.json';

/**
 * QA-112: six doctor-side families had only _one and _other, so i18next fell back to
 * _other for every other count. Arabic needs all six CLDR categories, and the fallback
 * produced the wrong form for 0, 2 and 11-99.
 *
 * This guards every plural family, not just the doctor ones.
 */

const ARABIC_PLURAL_FORMS = ['_zero', '_one', '_two', '_few', '_many', '_other'] as const;

type Json = Record<string, unknown>;

const merge = (...parts: Json[]): Json => Object.assign({}, ...parts) as Json;

const flatten = (value: Json, prefix = ''): Map<string, string> => {
  const out = new Map<string, string>();
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      for (const [k, v] of flatten(child as Json, path)) {
        out.set(k, v);
      }
    } else if (typeof child === 'string') {
      out.set(path, child);
    }
  }
  return out;
};

const en = flatten(merge(enCommon as Json, enExtra as Json, enInsurancePage as Json));
const ar = flatten(merge(arCommon as Json, arExtra as Json, arInsurancePage as Json));

const pluralBases = (keys: Iterable<string>): Set<string> => {
  const bases = new Set<string>();
  for (const key of keys) {
    for (const suffix of ARABIC_PLURAL_FORMS) {
      if (key.endsWith(suffix)) {
        bases.add(key.slice(0, -suffix.length));
      }
    }
  }
  return bases;
};

describe('Arabic plural completeness', () => {
  it('finds plural families to check', () => {
    expect(pluralBases(en.keys()).size).toBeGreaterThan(0);
  });

  it('gives every English plural family all six Arabic CLDR forms', () => {
    const incomplete: string[] = [];

    for (const base of [...pluralBases(en.keys())].sort()) {
      const missing = ARABIC_PLURAL_FORMS.filter((suffix) => !ar.has(base + suffix));
      if (missing.length > 0) {
        incomplete.push(`${base} is missing ${missing.join(', ')}`);
      }
    }

    expect(incomplete).toEqual([]);
  });

  it('leaves no Arabic plural form empty', () => {
    const empty: string[] = [];

    for (const base of pluralBases(ar.keys())) {
      for (const suffix of ARABIC_PLURAL_FORMS) {
        const value = ar.get(base + suffix);
        if (value !== undefined && value.trim() === '') {
          empty.push(base + suffix);
        }
      }
    }

    expect(empty.sort()).toEqual([]);
  });
});

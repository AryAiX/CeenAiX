import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import arCommon from '../locales/ar/common.json';
import arExtra from '../locales/ar/extra.json';
import enCommon from '../locales/en/common.json';
import enExtra from '../locales/en/extra.json';

/**
 * QA-157: the shared MessagesWorkspace builds its labels as `${namespace}.key`, where the namespace
 * depends on the portal (patient / doctor / pharmacy / clinic). The doctor-page key guard can't see
 * those, and the pharmacy and clinic portals were missing all 24 of them, so their Messages pages
 * showed raw keys. This test reads the keys the component uses and checks every portal, both languages.
 */

type Json = Record<string, unknown>;

const source = readFileSync(resolve(__dirname, '../components/MessagesWorkspace.tsx'), 'utf-8');
const usedKeys = Array.from(new Set(Array.from(source.matchAll(/`\$\{namespace\}\.([A-Za-z0-9_]+)`/g), (match) => match[1]))).sort();

const merged: Record<'en' | 'ar', Json> = {
  en: { ...(enCommon as Json), ...(enExtra as Json) },
  ar: { ...(arCommon as Json), ...(arExtra as Json) },
};

const messagesFor = (language: 'en' | 'ar', role: string): Json =>
  (((merged[language][role] as Json | undefined)?.messages as Json | undefined) ?? {}) as Json;

const hasKey = (namespace: Json, key: string) =>
  key in namespace || Object.keys(namespace).some((existing) => existing.startsWith(`${key}_`));

describe('MessagesWorkspace labels exist for every portal (QA-157)', () => {
  it('finds the labels the component uses', () => {
    expect(usedKeys.length).toBeGreaterThanOrEqual(20);
    expect(usedKeys).toContain('composerPlaceholder');
  });

  for (const role of ['patient', 'doctor', 'pharmacy', 'clinic']) {
    for (const language of ['en', 'ar'] as const) {
      it(`${role} (${language}) has every label`, () => {
        const namespace = messagesFor(language, role);
        expect(usedKeys.filter((key) => !hasKey(namespace, key))).toEqual([]);
      });
    }
  }
});

import { describe, expect, it } from 'vitest';
import arCommon from '../locales/ar/common.json';
import arExtra from '../locales/ar/extra.json';
import enCommon from '../locales/en/common.json';
import enExtra from '../locales/en/extra.json';

/**
 * QA-198: every clinic.* / shared.* key used by the translated clinic pages must exist in
 * BOTH English and Arabic (a missing key silently shows English, or the raw key, in Arabic).
 * Add each clinic page here as it is translated in the clinic QA pass.
 */
type Json = Record<string, unknown>;

const flatten = (value: Json, prefix = ''): Set<string> => {
  const keys = new Set<string>();
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      for (const nested of flatten(child as Json, path)) keys.add(nested);
    } else {
      keys.add(path);
    }
  }
  return keys;
};

const enKeys = flatten({ ...enCommon, ...enExtra } as Json);
const arKeys = flatten({ ...arCommon, ...arExtra } as Json);

const sources = import.meta.glob<string>(
  ['../pages/clinic/ClinicAppointments.tsx', '../pages/clinic/ClinicBookAppointmentModal.tsx', '../lib/clinic-booking.ts'],
  { query: '?raw', import: 'default', eager: true }
);

const literalKeys = new Set<string>();
for (const source of Object.values(sources)) {
  for (const match of source.matchAll(/['"`]((?:clinic|shared)\.[A-Za-z0-9_.]+[A-Za-z0-9_])['"`]/g)) {
    literalKeys.add(match[1]);
  }
}
// Keys built from a variable in the page (t(`clinic.appointments.${...}`))
const builtKeys = [
  ...['kpiTodayTotal', 'kpiCompletedToday', 'kpiUpcoming', 'kpiRevenueToday'].map((k) => `clinic.appointments.${k}`),
  ...['today', 'upcoming', 'past', 'all'].map((k) => `clinic.appointments.range.${k}`),
  ...['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'].map((k) => `shared.appointmentStatus.${k}`),
];

describe('clinic portal translation keys (QA-198)', () => {
  it('finds the keys used by the translated clinic pages', () => {
    expect(literalKeys.size).toBeGreaterThan(60);
  });

  it.each([...literalKeys, ...builtKeys].sort())('%s exists in English and Arabic', (key) => {
    expect(enKeys.has(key), `missing in English: ${key}`).toBe(true);
    expect(arKeys.has(key), `missing in Arabic: ${key}`).toBe(true);
  });

  it('Arabic texts are really translated (not copied English)', () => {
    const enFlat = (key: string) => key.split('.').reduce<unknown>((node, part) => (node as Json)?.[part], { ...enCommon });
    const arFlat = (key: string) => key.split('.').reduce<unknown>((node, part) => (node as Json)?.[part], { ...arCommon });
    const clinicKeys = [...literalKeys].filter((key) => key.startsWith('clinic.'));
    const copied = clinicKeys.filter((key) => enFlat(key) === arFlat(key));
    expect(copied).toEqual([]);
  });
});

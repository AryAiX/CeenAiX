import { describe, expect, it } from 'vitest';
import { getDefaultRouteForRole } from './auth-context';

describe('getDefaultRouteForRole', () => {
  it.each([
    ['patient', '/patient/dashboard'],
    ['doctor', '/doctor/dashboard'],
    ['pharmacy', '/pharmacy/dashboard'],
    ['lab', '/lab/dashboard'],
    ['insurance', '/insurance/dashboard'],
    ['clinic', '/clinic/dashboard'],
    ['super_admin', '/admin/dashboard'],
    ['facility_admin', '/admin/dashboard'],
  ] as const)('routes %s to %s', (role, expected) => {
    expect(getDefaultRouteForRole(role)).toBe(expected);
  });

  it('routes nurse (no portal) to the public home rather than onboarding', () => {
    expect(getDefaultRouteForRole('nurse')).toBe('/');
  });

  it('routes unauthenticated callers to onboarding', () => {
    expect(getDefaultRouteForRole(null)).toBe('/auth/onboarding');
    expect(getDefaultRouteForRole(undefined)).toBe('/auth/onboarding');
  });
});

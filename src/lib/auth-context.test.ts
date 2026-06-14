import { afterEach, describe, expect, it } from 'vitest';
import { clearLocalAuthState, getDefaultRouteForRole, getRoleDisplayName } from './auth-context';

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

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

describe('getRoleDisplayName', () => {
  it.each([
    ['patient', 'Patient'],
    ['doctor', 'Doctor / Clinician'],
    ['facility_admin', 'Facility admin'],
    ['super_admin', 'Administrator'],
  ] as const)('labels %s as %s', (role, expected) => {
    expect(getRoleDisplayName(role)).toBe(expected);
  });

  it('falls back to another role when the current role is unavailable', () => {
    expect(getRoleDisplayName(null)).toBe('another role');
    expect(getRoleDisplayName(undefined)).toBe('another role');
  });
});

describe('clearLocalAuthState', () => {
  it('removes Supabase auth and app session artifacts', () => {
    localStorage.setItem('ceenaix.lang', 'ar');
    localStorage.setItem('sb-test-project-auth-token', 'session');
    localStorage.setItem('supabase.auth.token', 'legacy-session');
    localStorage.setItem('unrelated-key', 'keep');
    sessionStorage.setItem('sb-test-project-auth-token', 'session');

    clearLocalAuthState();

    expect(localStorage.getItem('ceenaix.lang')).toBeNull();
    expect(localStorage.getItem('sb-test-project-auth-token')).toBeNull();
    expect(localStorage.getItem('supabase.auth.token')).toBeNull();
    expect(sessionStorage.getItem('sb-test-project-auth-token')).toBeNull();
    expect(localStorage.getItem('unrelated-key')).toBe('keep');
  });
});

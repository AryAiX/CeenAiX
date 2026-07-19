import { afterEach, describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import {
  clearLocalAuthState,
  getAuthMetadataRole,
  getDefaultRouteForRole,
  getRoleDisplayName,
} from './auth-context';

const buildUser = (overrides: Partial<User>): User =>
  ({
    id: 'user-id',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date(0).toISOString(),
    ...overrides,
  }) as User;

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
    ['facility_admin', '/clinic/dashboard'],
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

describe('getAuthMetadataRole', () => {
  it('prefers app metadata role over user metadata role', () => {
    const user = buildUser({
      app_metadata: { role: 'doctor' },
      user_metadata: { role: 'patient' },
    });

    expect(getAuthMetadataRole(user)).toBe('doctor');
  });

  it('ignores user metadata role when app metadata is missing', () => {
    const user = buildUser({
      user_metadata: { role: 'doctor' },
    });

    expect(getAuthMetadataRole(user)).toBeNull();
  });

  it('returns null when metadata does not contain a valid role', () => {
    const user = buildUser({
      app_metadata: { role: 'unknown' },
      user_metadata: { role: '' },
    });

    expect(getAuthMetadataRole(user)).toBeNull();
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

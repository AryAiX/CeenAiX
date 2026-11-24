import { describe, expect, it } from 'vitest';
import { safePortalActionPath } from './notification-links';

describe('safePortalActionPath (QA-163)', () => {
  it('keeps in-app doctor paths, with query and hash', () => {
    expect(safePortalActionPath('doctor', '/doctor/imaging')).toBe('/doctor/imaging');
    expect(safePortalActionPath('doctor', ' /doctor/settings?section=my-clinic ')).toBe(
      '/doctor/settings?section=my-clinic'
    );
    expect(safePortalActionPath('doctor', '/doctor/messages/abc/')).toBe('/doctor/messages/abc');
    expect(safePortalActionPath('doctor', '/doctor')).toBe('/doctor');
  });

  it('drops links to other portals, other sites and odd paths', () => {
    for (const href of [
      null,
      undefined,
      '',
      '/patient/lab-results',
      '/clinic/appointments',
      '/doctors-directory',
      'https://evil.example/doctor/imaging',
      '//evil.example/doctor/imaging',
      '/\\evil.example',
      'javascript:alert(1)',
      'doctor/imaging',
      '/doctor/../patient/records',
    ]) {
      expect(safePortalActionPath('doctor', href)).toBeNull();
    }
  });
});

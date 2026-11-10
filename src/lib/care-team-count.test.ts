import { describe, expect, it } from 'vitest';
import { careTeamCountLabel } from './care-team-count';

describe('care team count (QA-013)', () => {
  it('uses singular and plural in English', () => {
    expect(careTeamCountLabel(1, 'en')).toBe('1 doctor');
    expect(careTeamCountLabel(8, 'en')).toBe('8 doctors');
  });

  it('uses the Arabic singular, dual, plural and 11+ forms with Arabic digits', () => {
    expect(careTeamCountLabel(1, 'ar')).toBe('طبيب واحد');
    expect(careTeamCountLabel(2, 'ar')).toBe('طبيبان');
    expect(careTeamCountLabel(8, 'ar')).toBe('٨ أطباء');
    expect(careTeamCountLabel(12, 'ar')).toBe('١٢ طبيبًا');
  });
});

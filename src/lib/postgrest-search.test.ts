import { describe, expect, it } from 'vitest';
import { ilikeAnyFilter } from './postgrest-search';

describe('ilikeAnyFilter (QA-178)', () => {
  it('searches every column for the trimmed text, quoted', () => {
    expect(ilikeAnyFilter(['name', 'name_en'], '  Clinic ')).toBe(String.raw`name.ilike."%Clinic%",name_en.ilike."%Clinic%"`);
  });

  it('keeps commas, brackets, dots and apostrophes inside the quoted value', () => {
    expect(ilikeAnyFilter(['name'], `St. Mary's (Dubai), x`)).toBe(String.raw`name.ilike."%St. Mary's (Dubai), x%"`);
  });

  it('escapes double quotes for PostgREST', () => {
    expect(ilikeAnyFilter(['name'], 'a"b')).toBe(String.raw`name.ilike."%a\"b%"`);
  });

  it('escapes a backslash for LIKE and then for PostgREST', () => {
    // LIKE needs \\ for one backslash; PostgREST quoting doubles each of those again.
    expect(ilikeAnyFilter(['name'], String.raw`a\b`)).toBe(String.raw`name.ilike."%a\\\\b%"`);
  });

  it('matches % and _ literally', () => {
    // LIKE: \% and \_ ; PostgREST quoting turns each \ into \\.
    expect(ilikeAnyFilter(['name'], '50%_off')).toBe(String.raw`name.ilike."%50\\%\\_off%"`);
  });
});

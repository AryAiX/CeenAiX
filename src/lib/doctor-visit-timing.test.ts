import { describe, expect, it } from 'vitest';
import { formatElapsed, splitMinutes, visitTiming } from './doctor-visit-timing';

const start = '2026-11-20T10:00:00Z';
const at = (iso: string) => new Date(iso).getTime();

describe('visitTiming (QA-183)', () => {
  it('live visit: seconds since the scheduled start', () => {
    expect(visitTiming(start, at('2026-11-20T10:07:05Z'), true)).toEqual({ kind: 'elapsed', seconds: 425 });
  });

  it('live visit started early or left open for over 12 hours: no timer', () => {
    expect(visitTiming(start, at('2026-11-20T09:50:00Z'), true)).toEqual({ kind: 'inProgress' });
    expect(visitTiming(start, at('2026-11-21T00:00:01Z'), true)).toEqual({ kind: 'inProgress' });
  });

  it('next patient: minutes until the start, rounded up', () => {
    expect(visitTiming(start, at('2026-11-20T09:34:30Z'), false)).toEqual({ kind: 'startsIn', minutes: 26 });
  });

  it('next patient whose start time has passed: minutes late', () => {
    expect(visitTiming(start, at('2026-11-20T10:12:59Z'), false)).toEqual({ kind: 'late', minutes: 12 });
  });

  it('formats the timer and splits minutes', () => {
    expect(formatElapsed(425)).toBe('07:05');
    expect(formatElapsed(3725)).toBe('1:02:05');
    expect(splitMinutes(125)).toEqual({ hours: 2, minutes: 5 });
  });
});

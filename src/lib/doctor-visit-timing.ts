/**
 * QA-183: what the dashboard's big patient card says about time.
 * - Live visit: time since the scheduled start, ticking (appointments have no separate
 *   "started at" time, so the scheduled start is the best we have, and the card says so).
 * - Next patient: when the visit starts and how long until then, or how late it is.
 * The card used to say "Session started" and "Duration" for a patient who had not started yet,
 * and the live timer was computed once and never moved.
 */
export type VisitTiming =
  | { kind: 'elapsed'; seconds: number }
  | { kind: 'inProgress' }
  | { kind: 'startsIn'; minutes: number }
  | { kind: 'late'; minutes: number };

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export function visitTiming(scheduledAt: string, now: number, live: boolean): VisitTiming {
  const start = new Date(scheduledAt).getTime();
  if (Number.isNaN(start)) return live ? { kind: 'inProgress' } : { kind: 'startsIn', minutes: 0 };
  const diffMs = now - start;

  if (live) {
    // Started early, or left open for a very long time: no meaningful timer.
    if (diffMs < 0 || diffMs > TWELVE_HOURS_MS) return { kind: 'inProgress' };
    return { kind: 'elapsed', seconds: Math.floor(diffMs / 1000) };
  }

  if (diffMs < 0) return { kind: 'startsIn', minutes: Math.ceil(-diffMs / 60000) };
  return { kind: 'late', minutes: Math.floor(diffMs / 60000) };
}

/** 07:05 or 1:07:05 */
export function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const two = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${two(minutes)}:${two(secs)}` : `${two(minutes)}:${two(secs)}`;
}

/** Split minutes into hours and minutes for "in 2 h 5 min". */
export const splitMinutes = (total: number) => ({ hours: Math.floor(total / 60), minutes: total % 60 });

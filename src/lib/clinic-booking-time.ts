import { CLINIC_TIME_ZONE, calendarDayKeyInTimeZone } from './i18n-ui';

/**
 * QA-189: clinic booking times are clinic (Dubai) wall-clock times.
 *
 * Before this, the clinic Appointments page sent `2026-11-24T09:00:00` (no time zone) to the
 * database, which reads it as UTC, so a 09:00 booking was saved as 13:00 Dubai. The list also
 * mixed the UTC date with the browser's local time, "Today" was the UTC day, and the slot
 * picker compared booked visits in the browser's time zone and offered slots that had passed.
 *
 * The UAE has no daylight saving, so Dubai is always UTC+04:00 (same rule as clinicDayUtcBounds).
 */
const CLINIC_UTC_OFFSET = '+04:00';

const pad = (value: number) => value.toString().padStart(2, '0');

/** "09:00" or "09:00:00" -> minutes after midnight. */
export const timeToMinutes = (value: string): number => {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
};

export const minutesToTime = (value: number): string => `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;

/** Today's date in the clinic, as YYYY-MM-DD. */
export const clinicTodayKey = (now: Date = new Date()): string => calendarDayKeyInTimeZone(now, CLINIC_TIME_ZONE);

/** Clinic calendar day (YYYY-MM-DD) of a stored timestamp. */
export const clinicDateKey = (value: Date | string): string => calendarDayKeyInTimeZone(value, CLINIC_TIME_ZONE);

/** Clinic time of day (24-hour "HH:MM") of a stored timestamp. */
export const clinicTimeOfDay = (value: Date | string): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
};

/** Clinic date + clinic time ("2026-11-24", "09:00") -> UTC ISO string to store. */
export const clinicWallTimeToUtcIso = (dateKey: string, time: string): string => {
  const [hours = '00', minutes = '00'] = time.split(':');
  const iso = new Date(`${dateKey}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00${CLINIC_UTC_OFFSET}`);
  if (Number.isNaN(iso.getTime())) {
    throw new Error(`Invalid clinic date/time: ${dateKey} ${time}`);
  }
  return iso.toISOString();
};

/** First and last instant (UTC ISO) of a clinic calendar day. */
export const clinicDayRangeUtc = (dateKey: string) => ({
  startIso: new Date(`${dateKey}T00:00:00${CLINIC_UTC_OFFSET}`).toISOString(),
  endIso: new Date(`${dateKey}T23:59:59.999${CLINIC_UTC_OFFSET}`).toISOString(),
});

/** Weekday (0 = Sunday) of a clinic calendar day, independent of the browser's time zone. */
export const clinicDayOfWeek = (dateKey: string): number => new Date(`${dateKey}T12:00:00Z`).getUTCDay();

export interface ClinicAvailabilityWindow {
  start_time: string;
  end_time: string;
  slot_duration_minutes: number | null;
}

export interface ClinicBlockedTime {
  start_time: string;
  end_time: string;
}

export interface ClinicBookedVisit {
  scheduled_at: string;
  duration_minutes: number | null;
}

/**
 * Free slot start times ("HH:MM", clinic time) for one doctor on one clinic day.
 * Booked visits are compared in clinic time; on today's date, slots that have started are left out.
 */
export const buildClinicBookingSlots = ({
  dateKey,
  availability,
  blocked,
  booked,
  now = new Date(),
}: {
  dateKey: string;
  availability: ClinicAvailabilityWindow[];
  blocked: ClinicBlockedTime[];
  booked: ClinicBookedVisit[];
  now?: Date;
}): string[] => {
  const isToday = dateKey === clinicTodayKey(now);
  const nowMinutes = timeToMinutes(clinicTimeOfDay(now));
  const bookedRanges = booked
    .filter((visit) => clinicDateKey(visit.scheduled_at) === dateKey)
    .map((visit) => {
      const start = timeToMinutes(clinicTimeOfDay(visit.scheduled_at));
      return { start, end: start + (visit.duration_minutes || 30) };
    });
  const blockedRanges = blocked.map((block) => ({
    start: timeToMinutes(block.start_time),
    end: timeToMinutes(block.end_time),
  }));

  const slots = new Set<string>();
  for (const window of availability) {
    const duration = window.slot_duration_minutes || 30;
    const windowEnd = timeToMinutes(window.end_time);
    for (let cursor = timeToMinutes(window.start_time); cursor + duration <= windowEnd; cursor += duration) {
      const slotEnd = cursor + duration;
      const overlaps = (range: { start: number; end: number }) => cursor < range.end && slotEnd > range.start;
      if (isToday && cursor <= nowMinutes) continue;
      if (blockedRanges.some(overlaps) || bookedRanges.some(overlaps)) continue;
      slots.add(minutesToTime(cursor));
    }
  }
  return [...slots].sort();
};

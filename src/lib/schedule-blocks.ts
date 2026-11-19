import type { BlockedSlot, DoctorAvailability } from '../types';

/**
 * QA-128: show one-off blocked time on the weekly schedule.
 *
 * The weekly schedule is a recurring template ("every Friday 9-5"), so its slot count must
 * not change for a single blocked Friday. Instead each weekday lists the upcoming blocks that
 * fall on it, with how many bookable slots they remove that day.
 *
 * slotsRemovedByBlock mirrors generateAvailableTimeSlots (lib/appointment-booking): a slot is
 * removed when it overlaps the block, and slots shared by overlapping windows count once.
 */

type WindowLike = Pick<DoctorAvailability, 'day_of_week' | 'start_time' | 'end_time' | 'slot_duration_minutes' | 'is_active'>;
type BlockLike = Pick<BlockedSlot, 'blocked_date' | 'start_time' | 'end_time'>;

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/** 0 = Sunday ... 6 = Saturday, for a YYYY-MM-DD date, independent of the browser's time zone. */
export const weekdayOfDateKey = (dateKey: string) => new Date(`${dateKey}T12:00:00Z`).getUTCDay();

export const slotsRemovedByBlock = (windows: ReadonlyArray<WindowLike>, block: BlockLike): number => {
  const weekday = weekdayOfDateKey(block.blocked_date);
  const blockStart = toMinutes(block.start_time);
  const blockEnd = toMinutes(block.end_time);
  const removedStarts = new Set<number>();

  for (const window of windows) {
    if (!window.is_active || window.day_of_week !== weekday || window.slot_duration_minutes <= 0) continue;
    const windowEnd = toMinutes(window.end_time);
    for (
      let slotStart = toMinutes(window.start_time);
      slotStart + window.slot_duration_minutes <= windowEnd;
      slotStart += window.slot_duration_minutes
    ) {
      const slotEnd = slotStart + window.slot_duration_minutes;
      if (slotStart < blockEnd && blockStart < slotEnd) {
        removedStarts.add(slotStart);
      }
    }
  }

  return removedStarts.size;
};

/** Upcoming blocks (today or later, by YYYY-MM-DD key) grouped by weekday, soonest first. */
export const upcomingBlocksByWeekday = <Block extends BlockLike>(
  blocks: ReadonlyArray<Block>,
  todayKey: string
): Map<number, Block[]> => {
  const grouped = new Map<number, Block[]>();
  const upcoming = blocks
    .filter((block) => block.blocked_date >= todayKey)
    .slice()
    .sort((a, b) => a.blocked_date.localeCompare(b.blocked_date) || a.start_time.localeCompare(b.start_time));

  for (const block of upcoming) {
    const weekday = weekdayOfDateKey(block.blocked_date);
    grouped.set(weekday, [...(grouped.get(weekday) ?? []), block]);
  }
  return grouped;
};

/**
 * QA-129: recurring windows on the same day must not overlap.
 *
 * Patient booking merges overlapping windows, but the schedule page let doctors save them
 * without a warning and its slot totals counted the overlap twice. New and edited windows are
 * now checked against every other window on that day (active or paused, so activating a paused
 * window later can't create an overlap either), and slot totals count each bookable slot once.
 */
type TimeRangeLike = { day_of_week: number; start_time: string; end_time: string };

export const findOverlappingWindow = <Window extends TimeRangeLike & { id: string }>(
  windows: ReadonlyArray<Window>,
  candidate: TimeRangeLike,
  ignoreId?: string
): Window | undefined =>
  windows.find(
    (window) =>
      window.id !== ignoreId &&
      window.day_of_week === candidate.day_of_week &&
      toMinutes(window.start_time) < toMinutes(candidate.end_time) &&
      toMinutes(candidate.start_time) < toMinutes(window.end_time)
  );

/** Slots patients can actually book on a weekday: active windows only, shared slots counted once. */
export const bookableSlotsForDay = (windows: ReadonlyArray<WindowLike>, weekday: number): number => {
  const starts = new Set<number>();
  for (const window of windows) {
    if (!window.is_active || window.day_of_week !== weekday || window.slot_duration_minutes <= 0) continue;
    const windowEnd = toMinutes(window.end_time);
    for (
      let slotStart = toMinutes(window.start_time);
      slotStart + window.slot_duration_minutes <= windowEnd;
      slotStart += window.slot_duration_minutes
    ) {
      starts.add(slotStart);
    }
  }
  return starts.size;
};

export const weeklyBookableSlots = (windows: ReadonlyArray<WindowLike>): number =>
  [0, 1, 2, 3, 4, 5, 6].reduce((total, weekday) => total + bookableSlotsForDay(windows, weekday), 0);

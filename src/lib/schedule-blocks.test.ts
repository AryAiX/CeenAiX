import { describe, expect, it } from 'vitest';
import {
  bookableSlotsForDay,
  findOverlappingWindow,
  slotsRemovedByBlock,
  upcomingBlocksByWeekday,
  weekdayOfDateKey,
  weeklyBookableSlots,
} from './schedule-blocks';

// 21 Nov 2026 is a Saturday; 20 Nov 2026 is a Friday.
const fridayWindow = { day_of_week: 5, start_time: '09:00:00', end_time: '17:00:00', slot_duration_minutes: 30, is_active: true };

describe('weekdayOfDateKey', () => {
  it('returns the weekday of a YYYY-MM-DD date', () => {
    expect(weekdayOfDateKey('2026-11-20')).toBe(5);
    expect(weekdayOfDateKey('2026-11-22')).toBe(0);
  });
});

describe('slotsRemovedByBlock', () => {
  it('Friday 9-11 removes four 30-minute slots from a 9-5 Friday', () => {
    expect(slotsRemovedByBlock([fridayWindow], { blocked_date: '2026-11-20', start_time: '09:00', end_time: '11:00' })).toBe(4);
  });

  it('counts a slot the block only partly covers', () => {
    // 10:15-10:45 touches the 10:00 and 10:30 slots
    expect(slotsRemovedByBlock([fridayWindow], { blocked_date: '2026-11-20', start_time: '10:15', end_time: '10:45' })).toBe(2);
  });

  it('removes nothing on a day with no active window', () => {
    expect(slotsRemovedByBlock([fridayWindow], { blocked_date: '2026-11-21', start_time: '09:00', end_time: '11:00' })).toBe(0);
    expect(
      slotsRemovedByBlock([{ ...fridayWindow, is_active: false }], { blocked_date: '2026-11-20', start_time: '09:00', end_time: '11:00' })
    ).toBe(0);
  });

  it('counts slots shared by overlapping windows once, like patient booking does', () => {
    const morning = { ...fridayWindow, start_time: '09:00', end_time: '12:00' };
    const midday = { ...fridayWindow, start_time: '11:00', end_time: '14:00' };
    // 11:00-12:00 is in both windows: the 11:00 and 11:30 slots are removed once
    expect(slotsRemovedByBlock([morning, midday], { blocked_date: '2026-11-20', start_time: '11:00', end_time: '12:00' })).toBe(2);
  });

  it('does not count slots that only touch the block edge', () => {
    expect(slotsRemovedByBlock([fridayWindow], { blocked_date: '2026-11-20', start_time: '11:00', end_time: '11:00' })).toBe(0);
    expect(slotsRemovedByBlock([fridayWindow], { blocked_date: '2026-11-20', start_time: '17:00', end_time: '18:00' })).toBe(0);
  });
});

describe('upcomingBlocksByWeekday', () => {
  const blocks = [
    { id: 'past', blocked_date: '2026-11-13', start_time: '09:00', end_time: '10:00' },
    { id: 'next-fri-late', blocked_date: '2026-11-27', start_time: '14:00', end_time: '15:00' },
    { id: 'this-fri', blocked_date: '2026-11-20', start_time: '09:00', end_time: '11:00' },
    { id: 'sat', blocked_date: '2026-11-21', start_time: '09:00', end_time: '10:00' },
  ];

  it('drops past blocks and groups the rest by weekday, soonest first', () => {
    const grouped = upcomingBlocksByWeekday(blocks, '2026-11-19');
    expect(grouped.get(5)?.map((block) => block.id)).toEqual(['this-fri', 'next-fri-late']);
    expect(grouped.get(6)?.map((block) => block.id)).toEqual(['sat']);
    expect(grouped.has(4)).toBe(false);
  });

  it('keeps a block that is today', () => {
    expect(upcomingBlocksByWeekday(blocks, '2026-11-20').get(5)?.[0].id).toBe('this-fri');
  });
});

describe('findOverlappingWindow (QA-129)', () => {
  const windows = [
    { id: 'mon-am', day_of_week: 1, start_time: '09:00:00', end_time: '12:00:00' },
    { id: 'mon-pm', day_of_week: 1, start_time: '14:00:00', end_time: '17:00:00' },
    { id: 'tue', day_of_week: 2, start_time: '09:00:00', end_time: '17:00:00' },
  ];

  it('finds a window that overlaps on the same day', () => {
    expect(findOverlappingWindow(windows, { day_of_week: 1, start_time: '11:00', end_time: '14:00' })?.id).toBe('mon-am');
  });

  it('allows back-to-back windows and other days', () => {
    expect(findOverlappingWindow(windows, { day_of_week: 1, start_time: '12:00', end_time: '14:00' })).toBeUndefined();
    expect(findOverlappingWindow(windows, { day_of_week: 3, start_time: '09:00', end_time: '17:00' })).toBeUndefined();
  });

  it('ignores the window being edited', () => {
    expect(findOverlappingWindow(windows, { day_of_week: 1, start_time: '08:00', end_time: '12:30' }, 'mon-am')).toBeUndefined();
    expect(findOverlappingWindow(windows, { day_of_week: 1, start_time: '08:00', end_time: '14:30' }, 'mon-am')?.id).toBe('mon-pm');
  });
});

describe('bookableSlotsForDay / weeklyBookableSlots (QA-129)', () => {
  it('counts slots shared by overlapping windows once', () => {
    const overlapping = [
      { day_of_week: 1, start_time: '09:00', end_time: '12:00', slot_duration_minutes: 30, is_active: true },
      { day_of_week: 1, start_time: '11:00', end_time: '14:00', slot_duration_minutes: 30, is_active: true },
    ];
    // 9:00..13:30 = 10 slots, not 6 + 6 = 12
    expect(bookableSlotsForDay(overlapping, 1)).toBe(10);
  });

  it('does not count paused windows', () => {
    expect(bookableSlotsForDay([{ ...fridayWindow, is_active: false }], 5)).toBe(0);
  });

  it('adds up the week', () => {
    expect(weeklyBookableSlots([fridayWindow, { ...fridayWindow, day_of_week: 2, slot_duration_minutes: 60 }])).toBe(16 + 8);
  });
});

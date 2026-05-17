import type { Appointment, BlockedSlot, DoctorAvailability } from '../types';
import { dateTimeFormatWithNumerals, resolveLocale } from './i18n-ui';

export type OccupiedAppointmentSlot = Pick<Appointment, 'status' | 'scheduled_at' | 'duration_minutes'>;

export interface AvailableTimeSlot {
  iso: string;
  label: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

const OCCUPIED_APPOINTMENT_STATUSES = new Set(['scheduled', 'confirmed', 'in_progress']);

const pad = (value: number) => value.toString().padStart(2, '0');

const parseTime = (value: string) => {
  const [hours = '0', minutes = '0'] = value.split(':');
  return {
    hours: Number(hours),
    minutes: Number(minutes),
  };
};

export const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const buildScheduledAtIso = (date: Date, time: string) => {
  const { hours, minutes } = parseTime(time);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0
  ).toISOString();
};

const buildDateTime = (date: Date, time: string) => {
  const { hours, minutes } = parseTime(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
};

const overlaps = (startA: Date, endA: Date, startB: Date, endB: Date) =>
  startA < endB && endA > startB;

export const generateAvailableTimeSlots = ({
  date,
  availabilities,
  blockedSlots,
  appointments,
  uiLanguage = 'en',
}: {
  date: Date;
  availabilities: DoctorAvailability[];
  blockedSlots: BlockedSlot[];
  appointments: OccupiedAppointmentSlot[];
  /** i18n language (e.g. `ar`) — affects time slot labels */
  uiLanguage?: string;
}) => {
  const locale = resolveLocale(uiLanguage);
  const timeLabelOptions = dateTimeFormatWithNumerals(uiLanguage, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const dateKey = formatDateKey(date);
  const dayOfWeek = date.getDay();
  const now = new Date();
  const relevantAvailabilities = availabilities.filter(
    (availability) => availability.is_active && availability.day_of_week === dayOfWeek
  );

  if (relevantAvailabilities.length === 0) {
    return [] as AvailableTimeSlot[];
  }

  const relevantBlockedSlots = blockedSlots.filter((blockedSlot) => blockedSlot.blocked_date === dateKey);
  const relevantAppointments = appointments.filter((appointment) => {
    if (!OCCUPIED_APPOINTMENT_STATUSES.has(appointment.status)) {
      return false;
    }

    return formatDateKey(new Date(appointment.scheduled_at)) === dateKey;
  });

  const slotMap = new Map<string, AvailableTimeSlot>();

  relevantAvailabilities.forEach((availability) => {
    let cursor = buildDateTime(date, availability.start_time);
    const windowEnd = buildDateTime(date, availability.end_time);

    while (cursor < windowEnd) {
      const slotEnd = new Date(cursor.getTime() + availability.slot_duration_minutes * 60000);

      if (slotEnd > windowEnd) {
        break;
      }

      // Treat the slot as "past" only if it starts strictly before now —
      // a slot that begins exactly at the current minute should still be
      // bookable so the patient can take the immediate-next opening.
      const isPast = cursor.getTime() < now.getTime();
      const isBlocked = relevantBlockedSlots.some((blockedSlot) =>
        overlaps(
          cursor,
          slotEnd,
          buildDateTime(date, blockedSlot.start_time),
          buildDateTime(date, blockedSlot.end_time)
        )
      );
      const isBooked = relevantAppointments.some((appointment) => {
        const appointmentStart = new Date(appointment.scheduled_at);
        const appointmentEnd = new Date(
          appointmentStart.getTime() + appointment.duration_minutes * 60000
        );

        return overlaps(cursor, slotEnd, appointmentStart, appointmentEnd);
      });

      if (!isPast && !isBlocked && !isBooked) {
        const iso = cursor.toISOString();
        slotMap.set(iso, {
          iso,
          label: cursor.toLocaleTimeString(locale, timeLabelOptions),
          startTime: `${pad(cursor.getHours())}:${pad(cursor.getMinutes())}`,
          endTime: `${pad(slotEnd.getHours())}:${pad(slotEnd.getMinutes())}`,
          durationMinutes: availability.slot_duration_minutes,
        });
      }

      cursor = new Date(cursor.getTime() + availability.slot_duration_minutes * 60000);
    }
  });

  return Array.from(slotMap.values()).sort((left, right) => left.iso.localeCompare(right.iso));
};

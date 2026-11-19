import React, { useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  CalendarDays,
  Clock3,
  Plus,
  Trash2,
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { useDoctorSchedule } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import {
  CLINIC_TIME_ZONE,
  calendarDayKeyInTimeZone,
  dateTimeFormatWithNumerals,
  formatLocaleDigits,
  resolveLocale,
} from '../../lib/i18n-ui';
import {
  bookableSlotsForDay,
  findOverlappingWindow,
  slotsRemovedByBlock,
  upcomingBlocksByWeekday,
  weeklyBookableSlots,
} from '../../lib/schedule-blocks';
import { supabase } from '../../lib/supabase';

type FeedbackState =
  | {
      type: 'success' | 'error';
      message: string;
    }
  | null;

interface AvailabilityFormState {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: string;
}

interface BlockedSlotFormState {
  blockedDate: string;
  startTime: string;
  endTime: string;
  reason: string;
}

// day_of_week values as stored (0 = Sunday). Names come from the locale at render time.
const DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6].map((value) => ({ value }));

const INITIAL_AVAILABILITY_FORM: AvailabilityFormState = {
  dayOfWeek: '1',
  startTime: '09:00',
  endTime: '17:00',
  slotDurationMinutes: '30',
};

// QA-125: today's date in Dubai. toISOString() is UTC, which is still yesterday between
// 00:00 and 03:59 Dubai time.
const getTodayDate = () => calendarDayKeyInTimeZone(new Date(), CLINIC_TIME_ZONE);

const INITIAL_BLOCKED_SLOT_FORM = (): BlockedSlotFormState => ({
  blockedDate: getTodayDate(),
  startTime: '09:00',
  endTime: '10:00',
  reason: '',
});

const formatTimeLabel = (value: string, language: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  const locale = resolveLocale(language);
  return date.toLocaleTimeString(
    locale,
    dateTimeFormatWithNumerals(language, {
      hour: 'numeric',
      minute: '2-digit',
    })
  );
};

export const DoctorSchedule: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const locale = resolveLocale(i18n.language);
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(i18n.language, options);
  // 7 Jan 2024 was a Sunday, so 7 + day_of_week gives that weekday's name in the current language.
  const dayLabel = (value: number) => new Date(2024, 0, 7 + value).toLocaleDateString(locale, dtOpts({ weekday: 'long' }));
  // QA-129: message for a window that overlaps an existing one on the same day.
  const overlapMessage = (window: { day_of_week: number; start_time: string; end_time: string }) =>
    t('doctor.schedule.errOverlap', {
      day: dayLabel(window.day_of_week),
      range: t('doctor.schedule.timeRange', {
        start: formatTimeLabel(window.start_time, i18n.language),
        end: formatTimeLabel(window.end_time, i18n.language),
      }),
    });
  const { user } = useAuth();
  const { data, loading, error, refetch } = useDoctorSchedule(user?.id);

  const [availabilityForm, setAvailabilityForm] = useState(INITIAL_AVAILABILITY_FORM);
  const [blockedSlotForm, setBlockedSlotForm] = useState(INITIAL_BLOCKED_SLOT_FORM);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [isSavingBlockedSlot, setIsSavingBlockedSlot] = useState(false);
  const [busyAvailabilityId, setBusyAvailabilityId] = useState<string | null>(null);
  const [busyBlockedSlotId, setBusyBlockedSlotId] = useState<string | null>(null);
  const [showDeleteAvailabilityModal, setShowDeleteAvailabilityModal] = useState(false);
  const [deleteAvailabilityId, setDeleteAvailabilityId] = useState<string | null>(null);
  const [showDeleteBlockedSlotModal, setShowDeleteBlockedSlotModal] = useState(false);
  const [deleteBlockedSlotId, setDeleteBlockedSlotId] = useState<string | null>(null);
  const [showBlockedSlotHistory, setShowBlockedSlotHistory] = useState(false);
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<string | null>(null);
  const [editAvailabilityForm, setEditAvailabilityForm] = useState<AvailabilityFormState>(INITIAL_AVAILABILITY_FORM);

  const availabilities = useMemo(() => data?.availabilities ?? [], [data?.availabilities]);
  const blockedSlots = useMemo(() => data?.blockedSlots ?? [], [data?.blockedSlots]);

  const visibleBlockedSlots = useMemo(() => {
    if (showBlockedSlotHistory) return blockedSlots;
    return blockedSlots.filter((slot) => slot.blocked_date >= getTodayDate());
  }, [blockedSlots, showBlockedSlotHistory]);

  const pastBlockedSlotsCount = useMemo(() => {
    return blockedSlots.filter((slot) => slot.blocked_date < getTodayDate()).length;
  }, [blockedSlots]);

  const groupedAvailability = useMemo(
    () =>
      DAY_OPTIONS.map((day) => ({
        ...day,
        entries: availabilities.filter((availability) => availability.day_of_week === day.value),
      })),
    [availabilities]
  );

  const activeAvailabilityCount = availabilities.filter((availability) => availability.is_active).length;
  // QA-128: upcoming one-off blocks, shown on their weekday in the weekly schedule.
  const upcomingBlocks = useMemo(() => upcomingBlocksByWeekday(blockedSlots, getTodayDate()), [blockedSlots]);

  const setSuccess = (message: string) => setFeedback({ type: 'success', message });
  const setError = (message: string) => setFeedback({ type: 'error', message });

  const handleAvailabilitySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!user) {
      setError(t('doctor.schedule.errAuthAvailability'));
      return;
    }

    if (availabilityForm.startTime >= availabilityForm.endTime) {
      setError(t('doctor.schedule.errEndAfterStart'));
      return;
    }

    const slotDurationMinutes = Number(availabilityForm.slotDurationMinutes);
    if (!Number.isFinite(slotDurationMinutes) || slotDurationMinutes <= 0) {
      setError(t('doctor.schedule.errSlotDuration'));
      return;
    }

    const clash = findOverlappingWindow(availabilities, {
      day_of_week: Number(availabilityForm.dayOfWeek),
      start_time: availabilityForm.startTime,
      end_time: availabilityForm.endTime,
    });
    if (clash) {
      setError(overlapMessage(clash));
      return;
    }

    setIsSavingAvailability(true);

    const { error: insertError } = await supabase.from('doctor_availability').insert({
      doctor_id: user.id,
      facility_id: null,
      day_of_week: Number(availabilityForm.dayOfWeek),
      start_time: availabilityForm.startTime,
      end_time: availabilityForm.endTime,
      slot_duration_minutes: slotDurationMinutes,
      is_active: true,
    });

    setIsSavingAvailability(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setAvailabilityForm(INITIAL_AVAILABILITY_FORM);
    setSuccess(t('doctor.schedule.succAvailabilityAdded'));
    refetch();
  };

  const handleAvailabilityToggle = async (availabilityId: string, nextIsActive: boolean) => {
    setFeedback(null);
    setBusyAvailabilityId(availabilityId);

    const { error: updateError } = await supabase
      .from('doctor_availability')
      .update({ is_active: nextIsActive })
      .eq('id', availabilityId);

    setBusyAvailabilityId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(nextIsActive ? t('doctor.schedule.succAvailabilityActivated') : t('doctor.schedule.succAvailabilityPaused'));
    refetch();
  };

  const handleAvailabilityEdit = (entry: typeof availabilities[number]) => {
    setEditingAvailabilityId(entry.id);
    setEditAvailabilityForm({
      dayOfWeek: String(entry.day_of_week),
      startTime: entry.start_time,
      endTime: entry.end_time,
      slotDurationMinutes: String(entry.slot_duration_minutes),
    });
  };

  const handleAvailabilityUpdate = async (availabilityId: string) => {
    if (editAvailabilityForm.startTime >= editAvailabilityForm.endTime) {
      setError(t('doctor.schedule.errEditEndAfterStart'));
      return;
    }
    const editing = availabilities.find((availability) => availability.id === availabilityId);
    const clash = editing
      ? findOverlappingWindow(
          availabilities,
          { day_of_week: editing.day_of_week, start_time: editAvailabilityForm.startTime, end_time: editAvailabilityForm.endTime },
          availabilityId
        )
      : undefined;
    if (clash) {
      setError(overlapMessage(clash));
      return;
    }
    setFeedback(null);
    setBusyAvailabilityId(availabilityId);
    const { error: updateError } = await supabase
      .from('doctor_availability')
      .update({
        start_time: editAvailabilityForm.startTime,
        end_time: editAvailabilityForm.endTime,
        slot_duration_minutes: Number(editAvailabilityForm.slotDurationMinutes),
      })
      .eq('id', availabilityId);
    setBusyAvailabilityId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditingAvailabilityId(null);
    setSuccess(t('doctor.schedule.succAvailabilityUpdated'));
    refetch();
  };

  const handleAvailabilityDelete = (availabilityId: string) => {
    setDeleteAvailabilityId(availabilityId);
    setShowDeleteAvailabilityModal(true);
  };

  const confirmAvailabilityDelete = async () => {
    if (!deleteAvailabilityId) return;
    setFeedback(null);
    setBusyAvailabilityId(deleteAvailabilityId);
    setShowDeleteAvailabilityModal(false);
    const { error: deleteError } = await supabase
      .from('doctor_availability')
      .delete()
      .eq('id', deleteAvailabilityId);
    setBusyAvailabilityId(null);
    setDeleteAvailabilityId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSuccess(t('doctor.schedule.succAvailabilityRemoved'));
    refetch();
  };

  const handleBlockedSlotSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!user) {
      setError(t('doctor.schedule.errAuthBlock'));
      return;
    }

    if (blockedSlotForm.startTime >= blockedSlotForm.endTime) {
      setError(t('doctor.schedule.errBlockEndAfterStart'));
      return;
    }

    setIsSavingBlockedSlot(true);

    const { error: insertError } = await supabase.from('blocked_slots').insert({
      doctor_id: user.id,
      blocked_date: blockedSlotForm.blockedDate,
      start_time: blockedSlotForm.startTime,
      end_time: blockedSlotForm.endTime,
      reason: blockedSlotForm.reason.trim() || null,
    });

    setIsSavingBlockedSlot(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setBlockedSlotForm(INITIAL_BLOCKED_SLOT_FORM());
    setSuccess(t('doctor.schedule.succBlockAdded'));
    refetch();
  };

  const handleBlockedSlotDelete = (blockedSlotId: string) => {
    setDeleteBlockedSlotId(blockedSlotId);
    setShowDeleteBlockedSlotModal(true);
  };

  const confirmBlockedSlotDelete = async () => {
    if (!deleteBlockedSlotId) return;
    setFeedback(null);
    setBusyBlockedSlotId(deleteBlockedSlotId);
    setShowDeleteBlockedSlotModal(false);
    const { error: deleteError } = await supabase
      .from('blocked_slots')
      .delete()
      .eq('id', deleteBlockedSlotId);
    setBusyBlockedSlotId(null);
    setDeleteBlockedSlotId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSuccess(t('doctor.schedule.succBlockRemoved'));
    refetch();
  };

  const calculateSlots = (startTime: string, endTime: string, slotDurationMinutes: number): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    if (totalMinutes <= 0 || slotDurationMinutes <= 0) return 0;
    return Math.floor(totalMinutes / slotDurationMinutes);
  };

  // QA-129: bookable slots only (active windows, overlap counted once), same rule as patient booking.
  const totalWeeklySlots = useMemo(() => weeklyBookableSlots(availabilities), [availabilities]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('doctor.schedule.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('doctor.schedule.subtitle')}</p>
      </div>

      <div>
        {feedback ? (
          <div
            role="alert"
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border-red-100 bg-red-50 text-red-600'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => void refetch()} className="mt-2 font-semibold text-amber-900 underline">
              {t('shared.retry')}
            </button>
          </div>
        ) : null}

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{t('doctor.schedule.statActiveWindows')}</p>
            {loading ? <Skeleton className="mt-3 h-8 w-12" /> : <p className="mt-3 text-3xl font-bold text-gray-900">{formatLocaleDigits(activeAvailabilityCount, i18n.language)}</p>}
            <p className="mt-2 text-sm text-gray-600">{t('doctor.schedule.statActiveWindowsBody')}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{t('doctor.schedule.statUpcomingBlocked')}</p>
            {loading ? <Skeleton className="mt-3 h-8 w-12" /> : <p className="mt-3 text-3xl font-bold text-gray-900">{formatLocaleDigits(blockedSlots.filter((slot) => slot.blocked_date >= getTodayDate()).length, i18n.language)}</p>}
            <p className="mt-2 text-sm text-gray-600">{t('doctor.schedule.statUpcomingBlockedBody')}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{t('doctor.schedule.statReadiness')}</p>
            {loading ? (
              <Skeleton className="mt-3 h-8 w-24" />
            ) : (
              <p className={`mt-3 text-3xl font-bold ${activeAvailabilityCount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {activeAvailabilityCount > 0 ? t('doctor.schedule.readinessReady') : t('doctor.schedule.readinessNotYet')}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-600">{t('doctor.schedule.statReadinessBody')}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{t('doctor.schedule.statWeeklySlots')}</p>
            {loading ? (
              <Skeleton className="mt-3 h-8 w-12" />
            ) : (
              <p className={`mt-3 text-3xl font-bold ${totalWeeklySlots > 0 ? 'text-teal-600' : 'text-slate-400'}`}>
                {formatLocaleDigits(totalWeeklySlots, i18n.language)}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-600">
              {totalWeeklySlots > 0
                ? t('doctor.schedule.weeklySlotsBody', { count: totalWeeklySlots })
                : t('doctor.schedule.weeklySlotsEmpty')}
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-teal-100 p-3">
                  <CalendarDays className="h-5 w-5 text-teal-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('doctor.schedule.weeklyTitle')}</h2>
                  <p className="text-sm text-gray-600">{t('doctor.schedule.weeklySubtitle')}</p>
                </div>
              </div>

              <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleAvailabilitySubmit}>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-gray-700">{t('doctor.schedule.fieldDay')}</span>
                  <select
                    value={availabilityForm.dayOfWeek}
                    onChange={(event) =>
                      setAvailabilityForm((current) => ({ ...current, dayOfWeek: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  >
                    {DAY_OPTIONS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {dayLabel(day.value)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-gray-700">{t('doctor.schedule.fieldStart')}</span>
                  <input
                    type="time"
                    value={availabilityForm.startTime}
                    onChange={(event) =>
                      setAvailabilityForm((current) => ({ ...current, startTime: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-gray-700">{t('doctor.schedule.fieldEnd')}</span>
                  <input
                    type="time"
                    value={availabilityForm.endTime}
                    onChange={(event) =>
                      setAvailabilityForm((current) => ({ ...current, endTime: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-gray-700">{t('doctor.schedule.fieldSlotLength')}</span>
                  <select
                    value={availabilityForm.slotDurationMinutes}
                    onChange={(event) =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        slotDurationMinutes: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  >
                    <option value="15">{t('doctor.schedule.minutesOption', { value: formatLocaleDigits(15, i18n.language) })}</option>
                    <option value="20">{t('doctor.schedule.minutesOption', { value: formatLocaleDigits(20, i18n.language) })}</option>
                    <option value="30">{t('doctor.schedule.minutesOption', { value: formatLocaleDigits(30, i18n.language) })}</option>
                    <option value="45">{t('doctor.schedule.minutesOption', { value: formatLocaleDigits(45, i18n.language) })}</option>
                    <option value="60">{t('doctor.schedule.minutesOption', { value: formatLocaleDigits(60, i18n.language) })}</option>
                  </select>
                </label>

                <div className="md:col-span-2 xl:col-span-4">
                  <button
                    type="submit"
                    disabled={isSavingAvailability}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-emerald-800 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{isSavingAvailability ? t('doctor.schedule.saving') : t('doctor.schedule.addAvailability')}</span>
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">{t('doctor.schedule.currentTitle')}</h2>
              <p className="mt-1 text-sm text-gray-600">{t('doctor.schedule.currentSubtitle')}</p>

              <div className="mt-6 space-y-4">
                {loading ? (
                  <>
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                  </>
                ) : availabilities.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <CalendarDays className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                    <p className="font-semibold text-gray-900">{t('doctor.schedule.emptyAvailabilityTitle')}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {t('doctor.schedule.emptyAvailabilityBody')}
                    </p>
                  </div>
                ) : (
                  groupedAvailability.map((day) => (
                    <div key={day.value} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">{dayLabel(day.value)}</h3>
                        <span className="text-xs font-medium text-gray-500">
                          {day.entries.length === 0
                            ? t('doctor.schedule.dayUnavailable')
                            : `${t('doctor.schedule.windowsCount', { count: day.entries.length })} · ${t('doctor.schedule.slotsCount', {
                                count: bookableSlotsForDay(availabilities, day.value),
                              })}`}
                        </span>
                      </div>

                      {day.entries.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('doctor.schedule.dayNoWindows')}</p>
                      ) : (
                        <div className="space-y-3">
                          {day.entries.map((entry) => {
                            const isBusy = busyAvailabilityId === entry.id;
                            return (
                              <React.Fragment key={entry.id}>
                                {/* QA-127: wrap by available space, not window width. When the row is too narrow (side menu
                                    open, narrow column) the whole button group moves below the text as one unit. */}
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
                                  <div className="flex min-w-[14rem] flex-1 items-start gap-3">
                                    <div
                                      className={`rounded-lg p-2 ${
                                        entry.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                      }`}
                                    >
                                      <Clock3 className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {t('doctor.schedule.timeRange', {
                                          start: formatTimeLabel(entry.start_time, i18n.language),
                                          end: formatTimeLabel(entry.end_time, i18n.language),
                                        })}
                                      </p>
                                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                                      {t('doctor.schedule.minuteSlots', { value: formatLocaleDigits(entry.slot_duration_minutes, i18n.language) })}
                                      <span className='whitespace-nowrap rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700'>
                                        {t('doctor.schedule.slotsAvailable', {
                                          count: calculateSlots(entry.start_time, entry.end_time, entry.slot_duration_minutes),
                                        })}
                                      </span>
                                    </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        entry.is_active
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-gray-200 text-gray-700'
                                      }`}
                                    >
                                      {entry.is_active ? t('doctor.schedule.statusActive') : t('doctor.schedule.statusPaused')}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleAvailabilityToggle(entry.id, !entry.is_active)}
                                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {entry.is_active ? t('doctor.schedule.pause') : t('doctor.schedule.activate')}
                                    </button>
                                    <button
                                      type='button'
                                      disabled={isBusy}
                                      onClick={() => handleAvailabilityEdit(entry)}
                                      className='rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60'
                                    >
                                      ✏️ {t('doctor.schedule.edit')}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleAvailabilityDelete(entry.id)}
                                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span>{t('doctor.schedule.delete')}</span>
                                    </button>
                                  </div>
                                </div>

                                {editingAvailabilityId === entry.id ? (
                                  <div className='mt-2 rounded-xl border border-teal-200 bg-teal-50 p-5 space-y-4'>
                                    <div className='flex items-center justify-between'>
                                      <p className='text-sm font-bold text-teal-800'>✏️ {t('doctor.schedule.editTitle')}</p>
                                      <button
                                        type='button'
                                        onClick={() => setEditingAvailabilityId(null)}
                                        className='text-slate-400 hover:text-slate-600 text-sm'
                                      >
                                        ✕ {t('doctor.schedule.close')}
                                      </button>
                                    </div>
                                    <div className='grid gap-4 sm:grid-cols-3'>
                                      <label className='block'>
                                        <span className='mb-2 block text-sm font-semibold text-slate-700'>{t('doctor.schedule.fieldStartTime')}</span>
                                        <input
                                          type='time'
                                          value={editAvailabilityForm.startTime}
                                          onChange={(e) => setEditAvailabilityForm((prev) => ({ ...prev, startTime: e.target.value }))}
                                          className='w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                                        />
                                      </label>
                                      <label className='block'>
                                        <span className='mb-2 block text-sm font-semibold text-slate-700'>{t('doctor.schedule.fieldEndTime')}</span>
                                        <input
                                          type='time'
                                          value={editAvailabilityForm.endTime}
                                          onChange={(e) => setEditAvailabilityForm((prev) => ({ ...prev, endTime: e.target.value }))}
                                          className='w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                                        />
                                      </label>
                                      <label className='block'>
                                        <span className='mb-2 block text-sm font-semibold text-slate-700'>{t('doctor.schedule.fieldSlotDuration')}</span>
                                        <select
                                          value={editAvailabilityForm.slotDurationMinutes}
                                          onChange={(e) => setEditAvailabilityForm((prev) => ({ ...prev, slotDurationMinutes: e.target.value }))}
                                          className='w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                                        >
                                          <option value='15'>{t('doctor.schedule.minutesOption', { value: formatLocaleDigits(15, i18n.language) })}</option>
                                          <option value='20'>{t('doctor.schedule.minutesOption', { value: formatLocaleDigits(20, i18n.language) })}</option>
                                          <option value='30'>{t('doctor.schedule.minutesOption', { value: formatLocaleDigits(30, i18n.language) })}</option>
                                          <option value='45'>{t('doctor.schedule.minutesOption', { value: formatLocaleDigits(45, i18n.language) })}</option>
                                          <option value='60'>{t('doctor.schedule.minutesOption', { value: formatLocaleDigits(60, i18n.language) })}</option>
                                        </select>
                                      </label>
                                    </div>
                                    <div className='flex gap-3 pt-1'>
                                      <button
                                        type='button'
                                        onClick={() => handleAvailabilityUpdate(entry.id)}
                                        disabled={busyAvailabilityId === entry.id}
                                        className='rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60'
                                      >
                                        {t('doctor.schedule.saveChanges')}
                                      </button>
                                      <button
                                        type='button'
                                        onClick={() => setEditingAvailabilityId(null)}
                                        className='rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                                      >
                                        {t('shared.cancel')}
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}

                      {(upcomingBlocks.get(day.value) ?? []).length > 0 ? (
                        <ul className="mt-3 space-y-1.5">
                          {(upcomingBlocks.get(day.value) ?? []).map((block) => {
                            const removed = slotsRemovedByBlock(availabilities, block);
                            return (
                              <li
                                key={block.id}
                                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-800"
                              >
                                <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span className="font-semibold">
                                  {t('doctor.schedule.blockedOnDay', {
                                    date: new Date(`${block.blocked_date}T00:00:00`).toLocaleDateString(
                                      locale,
                                      dtOpts({ weekday: 'short', day: 'numeric', month: 'short' })
                                    ),
                                    range: t('doctor.schedule.timeRange', {
                                      start: formatTimeLabel(block.start_time, i18n.language),
                                      end: formatTimeLabel(block.end_time, i18n.language),
                                    }),
                                  })}
                                </span>
                                <span>
                                  ·{' '}
                                  {removed > 0
                                    ? t('doctor.schedule.slotsRemoved', { count: removed })
                                    : t('doctor.schedule.slotsRemovedNone')}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-orange-100 p-3">
                  <Ban className="h-5 w-5 text-orange-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('doctor.schedule.blockTitle')}</h2>
                  <p className="text-sm text-gray-600">{t('doctor.schedule.blockSubtitle')}</p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleBlockedSlotSubmit}>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-gray-700">{t('doctor.schedule.fieldDate')}</span>
                  <input
                    type="date"
                    min={getTodayDate()}
                    value={blockedSlotForm.blockedDate}
                    onChange={(event) =>
                      setBlockedSlotForm((current) => ({ ...current, blockedDate: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    required
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-gray-700">{t('doctor.schedule.fieldStart')}</span>
                    <input
                      type="time"
                      value={blockedSlotForm.startTime}
                      onChange={(event) =>
                        setBlockedSlotForm((current) => ({ ...current, startTime: event.target.value }))
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                      required
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-gray-700">{t('doctor.schedule.fieldEnd')}</span>
                    <input
                      type="time"
                      value={blockedSlotForm.endTime}
                      onChange={(event) =>
                        setBlockedSlotForm((current) => ({ ...current, endTime: event.target.value }))
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                      required
                    />
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-gray-700">{t('doctor.schedule.reasonLabel')}</span>
                  <textarea
                    value={blockedSlotForm.reason}
                    onChange={(event) =>
                      setBlockedSlotForm((current) => ({ ...current, reason: event.target.value }))
                    }
                    maxLength={500}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    placeholder={t('doctor.schedule.reasonPh')}
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSavingBlockedSlot}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isSavingBlockedSlot ? t('doctor.schedule.saving') : t('doctor.schedule.addBlock')}</span>
                </button>
              </form>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('doctor.schedule.upcomingBlockedTitle')}</h2>
                  <p className="mt-1 text-sm text-gray-600">{t('doctor.schedule.upcomingBlockedSubtitle')}</p>
                </div>
                {pastBlockedSlotsCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowBlockedSlotHistory((prev) => !prev)}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    {showBlockedSlotHistory
                      ? t('doctor.schedule.hideHistory')
                      : t('doctor.schedule.showHistory', { value: formatLocaleDigits(pastBlockedSlotsCount, i18n.language) })}
                  </button>
                ) : null}
              </div>

              <div className="mt-6 space-y-3">
                {loading ? (
                  <>
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                  </>
                ) : visibleBlockedSlots.length === 0 && !showBlockedSlotHistory ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <Ban className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                    <p className="font-semibold text-gray-900">{t('doctor.schedule.emptyBlockedTitle')}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {t('doctor.schedule.emptyBlockedBody')}
                    </p>
                  </div>
                ) : (
                  visibleBlockedSlots.map((slot) => {
                    const isBusy = busyBlockedSlotId === slot.id;

                    return (
                      <div key={slot.id} className={`rounded-xl border p-4 ${slot.blocked_date < getTodayDate() ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-orange-100 bg-orange-50'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {new Date(`${slot.blocked_date}T00:00:00`).toLocaleDateString(
                                locale,
                                dtOpts({
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              )}
                            </p>
                            <p className="mt-1 text-sm text-gray-700">
                              {t('doctor.schedule.timeRange', {
                                start: formatTimeLabel(slot.start_time, i18n.language),
                                end: formatTimeLabel(slot.end_time, i18n.language),
                              })}
                            </p>
                            <p className="mt-2 text-sm text-gray-600">{slot.reason ?? t('doctor.schedule.noReason')}</p>
                          </div>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleBlockedSlotDelete(slot.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>{t('doctor.schedule.remove')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {showDeleteAvailabilityModal ? createPortal(
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
          onClick={() => setShowDeleteAvailabilityModal(false)}>
          <div className='w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl'
            onClick={(e) => e.stopPropagation()}>
            <h3 className='text-lg font-bold text-slate-900'>{t('doctor.schedule.deleteModalTitle')}</h3>
            <p className='mt-2 text-sm text-slate-600'>{t('doctor.schedule.deleteModalBody')}</p>
            <div className='mt-5 flex gap-3'>
              <button type='button' onClick={() => setShowDeleteAvailabilityModal(false)}
                className='flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
                {t('shared.cancel')}
              </button>
              <button type='button' onClick={confirmAvailabilityDelete}
                className='flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700'>
                {t('doctor.schedule.delete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {showDeleteBlockedSlotModal ? createPortal(
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
          onClick={() => setShowDeleteBlockedSlotModal(false)}>
          <div className='w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl'
            onClick={(e) => e.stopPropagation()}>
            <h3 className='text-lg font-bold text-slate-900'>{t('doctor.schedule.removeModalTitle')}</h3>
            <p className='mt-2 text-sm text-slate-600'>{t('doctor.schedule.removeModalBody')}</p>
            <div className='mt-5 flex gap-3'>
              <button type='button' onClick={() => setShowDeleteBlockedSlotModal(false)}
                className='flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
                {t('shared.cancel')}
              </button>
              <button type='button' onClick={confirmBlockedSlotDelete}
                className='flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700'>
                {t('doctor.schedule.remove')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
};

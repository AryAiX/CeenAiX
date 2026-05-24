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
import { dateTimeFormatWithNumerals, resolveLocale } from '../../lib/i18n-ui';
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

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const INITIAL_AVAILABILITY_FORM: AvailabilityFormState = {
  dayOfWeek: '1',
  startTime: '09:00',
  endTime: '17:00',
  slotDurationMinutes: '30',
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

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
  const { i18n } = useTranslation('common');
  const locale = resolveLocale(i18n.language);
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(i18n.language, options);
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
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<string | null>(null);
  const [editAvailabilityForm, setEditAvailabilityForm] = useState<AvailabilityFormState>(INITIAL_AVAILABILITY_FORM);

  const availabilities = useMemo(() => data?.availabilities ?? [], [data?.availabilities]);
  const blockedSlots = useMemo(() => data?.blockedSlots ?? [], [data?.blockedSlots]);

  const groupedAvailability = useMemo(
    () =>
      DAY_OPTIONS.map((day) => ({
        ...day,
        entries: availabilities.filter((availability) => availability.day_of_week === day.value),
      })),
    [availabilities]
  );

  const activeAvailabilityCount = availabilities.filter((availability) => availability.is_active).length;

  const setSuccess = (message: string) => setFeedback({ type: 'success', message });
  const setError = (message: string) => setFeedback({ type: 'error', message });

  const handleAvailabilitySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!user) {
      setError('You need to be signed in as a doctor to manage availability.');
      return;
    }

    if (availabilityForm.startTime >= availabilityForm.endTime) {
      setError('Availability end time must be later than the start time.');
      return;
    }

    const slotDurationMinutes = Number(availabilityForm.slotDurationMinutes);
    if (!Number.isFinite(slotDurationMinutes) || slotDurationMinutes <= 0) {
      setError('Choose a valid slot duration.');
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
    setSuccess('Weekly availability window added.');
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

    setSuccess(nextIsActive ? 'Availability activated.' : 'Availability paused.');
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
      setError('End time must be later than start time.');
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
    setSuccess('Availability window updated.');
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
    setSuccess('Availability window removed.');
    refetch();
  };

  const handleBlockedSlotSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!user) {
      setError('You need to be signed in as a doctor to block time.');
      return;
    }

    if (blockedSlotForm.startTime >= blockedSlotForm.endTime) {
      setError('Blocked slot end time must be later than the start time.');
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
    setSuccess('Blocked time added to your schedule.');
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
    setSuccess('Blocked time removed.');
    refetch();
  };

  const calculateSlots = (startTime: string, endTime: string, slotDurationMinutes: number): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    if (totalMinutes <= 0 || slotDurationMinutes <= 0) return 0;
    return Math.floor(totalMinutes / slotDurationMinutes);
  };

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
        <p className="mt-1 text-sm text-slate-500">Manage the recurring availability and blocked time that patients can book against.</p>
      </div>

      <div>
        {feedback ? (
          <div
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
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Doctor schedule data could not be loaded yet.
          </div>
        ) : null}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Active weekly windows</p>
            {loading ? <Skeleton className="mt-3 h-8 w-12" /> : <p className="mt-3 text-3xl font-bold text-gray-900">{activeAvailabilityCount}</p>}
            <p className="mt-2 text-sm text-gray-600">Patients can book only against active recurring hours.</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Upcoming blocked slots</p>
            {loading ? <Skeleton className="mt-3 h-8 w-12" /> : <p className="mt-3 text-3xl font-bold text-gray-900">{blockedSlots.length}</p>}
            <p className="mt-2 text-sm text-gray-600">Use blocked slots for leave, meetings, and time away from clinic.</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Booking readiness</p>
            {loading ? (
              <Skeleton className="mt-3 h-8 w-24" />
            ) : (
              <p className="mt-3 text-3xl font-bold text-gray-900">{activeAvailabilityCount > 0 ? 'Ready' : 'Not yet'}</p>
            )}
            <p className="mt-2 text-sm text-gray-600">Add at least one active recurring window before patient booking is enabled.</p>
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
                  <h2 className="text-xl font-bold text-gray-900">Weekly Availability</h2>
                  <p className="text-sm text-gray-600">Create the recurring hours patients should see when choosing a slot.</p>
                </div>
              </div>

              <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleAvailabilitySubmit}>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Day</span>
                  <select
                    value={availabilityForm.dayOfWeek}
                    onChange={(event) =>
                      setAvailabilityForm((current) => ({ ...current, dayOfWeek: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  >
                    {DAY_OPTIONS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Start</span>
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
                  <span className="text-sm font-semibold text-gray-700">End</span>
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
                  <span className="text-sm font-semibold text-gray-700">Slot length</span>
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
                    <option value="15">15 min</option>
                    <option value="20">20 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                  </select>
                </label>

                <div className="md:col-span-2 xl:col-span-4">
                  <button
                    type="submit"
                    disabled={isSavingAvailability}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-emerald-800 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{isSavingAvailability ? 'Saving...' : 'Add recurring availability'}</span>
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">Current Weekly Schedule</h2>
              <p className="mt-1 text-sm text-gray-600">Pause or remove recurring windows as your practice hours change.</p>

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
                    <p className="font-semibold text-gray-900">No recurring availability yet</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Add your weekly working hours here before patient booking goes live.
                    </p>
                  </div>
                ) : (
                  groupedAvailability.map((day) => (
                    <div key={day.value} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">{day.label}</h3>
                        <span className="text-xs font-medium text-gray-500">
                          {day.entries.length === 0
                            ? 'Unavailable'
                            : `${day.entries.length} window${day.entries.length === 1 ? '' : 's'} · ${day.entries.reduce((total, entry) => total + calculateSlots(entry.start_time, entry.end_time, entry.slot_duration_minutes), 0)} slots`}
                        </span>
                      </div>

                      {day.entries.length === 0 ? (
                        <p className="text-sm text-gray-500">No active or paused recurring windows for this day.</p>
                      ) : (
                        <div className="space-y-3">
                          {day.entries.map((entry) => {
                            const isBusy = busyAvailabilityId === entry.id;
                            return (
                              <React.Fragment key={entry.id}>
                                <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                                  <div className="flex items-start gap-3">
                                    <div
                                      className={`rounded-lg p-2 ${
                                        entry.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                      }`}
                                    >
                                      <Clock3 className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {formatTimeLabel(entry.start_time, i18n.language)} to {formatTimeLabel(entry.end_time, i18n.language)}
                                      </p>
                                    <p className="mt-1 text-sm text-gray-600">
                                      {entry.slot_duration_minutes} minute slots
                                      <span className='ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700'>
                                        {calculateSlots(entry.start_time, entry.end_time, entry.slot_duration_minutes)} slots available
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
                                      {entry.is_active ? 'Active' : 'Paused'}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleAvailabilityToggle(entry.id, !entry.is_active)}
                                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {entry.is_active ? 'Pause' : 'Activate'}
                                    </button>
                                    <button
                                      type='button'
                                      disabled={isBusy}
                                      onClick={() => handleAvailabilityEdit(entry)}
                                      className='rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60'
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleAvailabilityDelete(entry.id)}
                                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </div>

                                {editingAvailabilityId === entry.id ? (
                                  <div className='mt-2 rounded-xl border border-teal-200 bg-teal-50 p-5 space-y-4'>
                                    <div className='flex items-center justify-between'>
                                      <p className='text-sm font-bold text-teal-800'>✏️ Edit Availability Window</p>
                                      <button
                                        type='button'
                                        onClick={() => setEditingAvailabilityId(null)}
                                        className='text-slate-400 hover:text-slate-600 text-sm'
                                      >
                                        ✕ Close
                                      </button>
                                    </div>
                                    <div className='grid gap-4 sm:grid-cols-3'>
                                      <label className='block'>
                                        <span className='mb-2 block text-sm font-semibold text-slate-700'>Start Time</span>
                                        <input
                                          type='time'
                                          value={editAvailabilityForm.startTime}
                                          onChange={(e) => setEditAvailabilityForm((prev) => ({ ...prev, startTime: e.target.value }))}
                                          className='w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                                        />
                                      </label>
                                      <label className='block'>
                                        <span className='mb-2 block text-sm font-semibold text-slate-700'>End Time</span>
                                        <input
                                          type='time'
                                          value={editAvailabilityForm.endTime}
                                          onChange={(e) => setEditAvailabilityForm((prev) => ({ ...prev, endTime: e.target.value }))}
                                          className='w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                                        />
                                      </label>
                                      <label className='block'>
                                        <span className='mb-2 block text-sm font-semibold text-slate-700'>Slot Duration</span>
                                        <select
                                          value={editAvailabilityForm.slotDurationMinutes}
                                          onChange={(e) => setEditAvailabilityForm((prev) => ({ ...prev, slotDurationMinutes: e.target.value }))}
                                          className='w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                                        >
                                          <option value='15'>15 min</option>
                                          <option value='20'>20 min</option>
                                          <option value='30'>30 min</option>
                                          <option value='45'>45 min</option>
                                          <option value='60'>60 min</option>
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
                                        Save Changes
                                      </button>
                                      <button
                                        type='button'
                                        onClick={() => setEditingAvailabilityId(null)}
                                        className='rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}
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
                  <h2 className="text-xl font-bold text-gray-900">Block Time</h2>
                  <p className="text-sm text-gray-600">Temporarily hide slots for leave, meetings, or time off.</p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleBlockedSlotSubmit}>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Date</span>
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
                    <span className="text-sm font-semibold text-gray-700">Start</span>
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
                    <span className="text-sm font-semibold text-gray-700">End</span>
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
                  <span className="text-sm font-semibold text-gray-700">Reason</span>
                  <textarea
                    value={blockedSlotForm.reason}
                    onChange={(event) =>
                      setBlockedSlotForm((current) => ({ ...current, reason: event.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    placeholder="Optional note for your own reference"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSavingBlockedSlot}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isSavingBlockedSlot ? 'Saving...' : 'Add blocked time'}</span>
                </button>
              </form>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">Upcoming Blocked Slots</h2>
              <p className="mt-1 text-sm text-gray-600">These one-off blocks override your recurring weekly availability.</p>

              <div className="mt-6 space-y-3">
                {loading ? (
                  <>
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                  </>
                ) : blockedSlots.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <Ban className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                    <p className="font-semibold text-gray-900">No blocked time yet</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Add one-off blocks here when you need to close parts of your schedule.
                    </p>
                  </div>
                ) : (
                  blockedSlots.map((slot) => {
                    const isBusy = busyBlockedSlotId === slot.id;

                    return (
                      <div key={slot.id} className="rounded-xl border border-orange-100 bg-orange-50 p-4">
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
                              {formatTimeLabel(slot.start_time, i18n.language)} to{' '}
                              {formatTimeLabel(slot.end_time, i18n.language)}
                            </p>
                            <p className="mt-2 text-sm text-gray-600">{slot.reason ?? 'No reason added'}</p>
                          </div>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleBlockedSlotDelete(slot.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Remove</span>
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
            <h3 className='text-lg font-bold text-slate-900'>Delete Availability Window</h3>
            <p className='mt-2 text-sm text-slate-600'>Are you sure you want to delete this recurring availability window? This action cannot be undone.</p>
            <div className='mt-5 flex gap-3'>
              <button type='button' onClick={() => setShowDeleteAvailabilityModal(false)}
                className='flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
                Cancel
              </button>
              <button type='button' onClick={confirmAvailabilityDelete}
                className='flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700'>
                Delete
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
            <h3 className='text-lg font-bold text-slate-900'>Remove Blocked Time</h3>
            <p className='mt-2 text-sm text-slate-600'>Are you sure you want to remove this blocked time from your schedule?</p>
            <div className='mt-5 flex gap-3'>
              <button type='button' onClick={() => setShowDeleteBlockedSlotModal(false)}
                className='flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
                Cancel
              </button>
              <button type='button' onClick={confirmBlockedSlotDelete}
                className='flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700'>
                Remove
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
};

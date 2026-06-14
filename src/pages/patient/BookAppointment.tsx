import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  Search,
  Stethoscope,
  X,
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { SpecializationMultiSelect } from '../../components/SpecializationMultiSelect';
import { useBookableDoctors, useDoctorBookingAvailability, useQuery, useSpecializations } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { generateAvailableTimeSlots, type AvailableTimeSlot } from '../../lib/appointment-booking';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { supabase } from '../../lib/supabase';
import { calendarWeekdayShort, dateTimeFormatWithNumerals, formatLocaleDigits, resolveLocale } from '../../lib/i18n-ui';

const getMonthDays = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  const days: Array<Date | null> = [];

  for (let index = 0; index < startingDayOfWeek; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
};

const isPastDate = (date: Date) => {
  const today = new Date();
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date < currentDay;
};

interface RescheduleAppointment {
  id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  chief_complaint: string | null;
  notes: string | null;
  status: string;
}

async function notifyClinicStaff(facilityId: string, title: string, body: string, actionUrl = '/clinic/appointments') {
  const { data: members } = await supabase
    .from('clinic_portal_members')
    .select('user_id')
    .eq('facility_id', facilityId)
    .eq('is_active', true);

  if (!members || members.length === 0) return;

  await supabase.from('notifications').insert(
    members.map((m) => ({
      user_id: m.user_id,
      type: 'appointment' as const,
      title,
      body,
      action_url: actionUrl,
    }))
  );
}

export const BookAppointment: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation('common');
  const locale = resolveLocale(i18n.language);
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(i18n.language, options);
  const weekdayLabels = useMemo(() => calendarWeekdayShort(t), [t]);
  const { user } = useAuth();
  const rescheduleAppointmentId = searchParams.get('reschedule');
  const requestedDoctorId = searchParams.get('doctor');
  const requestSource = searchParams.get('source');
  const isRescheduling = Boolean(rescheduleAppointmentId);
  const {
    data: doctorsData,
    loading: doctorsLoading,
    error: doctorsError,
  } = useBookableDoctors();
  const doctors = useMemo(() => doctorsData ?? [], [doctorsData]);
  const {
    data: specializationOptionsData,
    loading: specializationsLoading,
    error: specializationsError,
  } = useSpecializations();
  const specializationOptions = useMemo(
    () => specializationOptionsData ?? [],
    [specializationOptionsData]
  );

  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecializationIds, setSelectedSpecializationIds] = useState<string[]>([]);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didInitializeReschedule, setDidInitializeReschedule] = useState(false);
  const [didInitializeAiPrefill, setDidInitializeAiPrefill] = useState(false);
  const [appointmentType, setAppointmentType] = useState<'in_person' | 'virtual'>('in_person');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);

  const isDoctorSelectionLocked = useMemo(
    () =>
      !isRescheduling &&
      requestSource === 'message' &&
      Boolean(requestedDoctorId) &&
      doctors.some((doctor) => doctor.userId === requestedDoctorId),
    [doctors, isRescheduling, requestSource, requestedDoctorId]
  );

  const {
    data: rescheduleAppointment,
    loading: rescheduleLoading,
    error: rescheduleError,
  } = useQuery<RescheduleAppointment | null>(
    async () => {
      if (!rescheduleAppointmentId || !user) {
        return null;
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('id, doctor_id, scheduled_at, duration_minutes, chief_complaint, notes, status')
        .eq('id', rescheduleAppointmentId)
        .eq('patient_id', user.id)
        .eq('is_deleted', false)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    [rescheduleAppointmentId ?? '', user?.id ?? '']
  );

  useEffect(() => {
    if (isRescheduling) {
      return;
    }

    if (selectedDoctorId || doctors.length === 0) {
      return;
    }

    if (requestedDoctorId && doctors.some((doctor) => doctor.userId === requestedDoctorId)) {
      setSelectedDoctorId(requestedDoctorId);
      return;
    }

    if (searchTerm.trim().length > 0 || selectedSpecializationIds.length > 0) {
      return;
    }

    setSelectedDoctorId(doctors[0]?.userId ?? null);
  }, [doctors, isRescheduling, requestedDoctorId, searchTerm, selectedDoctorId, selectedSpecializationIds]);

  useEffect(() => {
    if (isRescheduling || didInitializeAiPrefill) {
      return;
    }

    const requestedSpecializationId = searchParams.get('specialization');
    const requestedReason = searchParams.get('reason');
    const requestedNotes = searchParams.get('notes');

    if (requestedSpecializationId && specializationsLoading) {
      return;
    }

    if (
      requestedSpecializationId &&
      specializationOptions.some((specialization) => specialization.id === requestedSpecializationId)
    ) {
      setSelectedSpecializationIds([requestedSpecializationId]);
    }

    if (requestedReason && !chiefComplaint.trim()) {
      setChiefComplaint(requestedReason);
    }

    if (requestedNotes && !notes.trim()) {
      setNotes(requestedNotes);
    }

    setDidInitializeAiPrefill(true);
  }, [
    chiefComplaint,
    didInitializeAiPrefill,
    isRescheduling,
    notes,
    requestedDoctorId,
    searchParams,
    specializationsLoading,
    specializationOptions,
  ]);

  useEffect(() => {
    if (!isRescheduling || !rescheduleAppointment || didInitializeReschedule) {
      return;
    }

    const scheduledDate = new Date(rescheduleAppointment.scheduled_at);
    setSelectedDoctorId(rescheduleAppointment.doctor_id);
    setSelectedDate(scheduledDate);
    setCurrentMonth(new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), 1));
    setChiefComplaint(rescheduleAppointment.chief_complaint ?? '');
    setNotes(rescheduleAppointment.notes ?? '');
    setDidInitializeReschedule(true);
  }, [didInitializeReschedule, isRescheduling, rescheduleAppointment]);

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.userId === selectedDoctorId) ?? null,
    [doctors, selectedDoctorId]
  );

  const {
    data: availabilityData,
    loading: availabilityLoading,
    error: availabilityError,
  } = useDoctorBookingAvailability(selectedDoctorId);

  const filteredDoctors = useMemo(
    () =>
      doctors.filter((doctor) => {
        if (isDoctorSelectionLocked) {
          return doctor.userId === requestedDoctorId;
        }

        if (isRescheduling) {
          if (!rescheduleAppointment) {
            return false;
          }

          return doctor.userId === rescheduleAppointment.doctor_id;
        }

        const normalizedSearch = searchTerm.trim().toLowerCase();
        const matchesSearch =
          normalizedSearch.length === 0 ||
          doctor.fullName.toLowerCase().includes(normalizedSearch) ||
          (doctor.specialty ?? '').toLowerCase().includes(normalizedSearch) ||
          (doctor.city ?? '').toLowerCase().includes(normalizedSearch);

        const matchesSpecialty =
          selectedSpecializationIds.length === 0 ||
          selectedSpecializationIds.some((specializationId) =>
            doctor.specializationIds.includes(specializationId)
          );

        return matchesSearch && matchesSpecialty;
      }),
    [
      doctors,
      isDoctorSelectionLocked,
      isRescheduling,
      requestedDoctorId,
      rescheduleAppointment,
      searchTerm,
      selectedSpecializationIds,
    ]
  );

  useEffect(() => {
    if (!selectedDoctorId) {
      return;
    }

    if (filteredDoctors.some((doctor) => doctor.userId === selectedDoctorId)) {
      return;
    }

    setSelectedDoctorId(filteredDoctors[0]?.userId ?? null);
    setSelectedDate(null);
    setSelectedSlotIso(null);
  }, [filteredDoctors, selectedDoctorId]);

  const availableSlotsForSelectedDate = useMemo<AvailableTimeSlot[]>(() => {
    if (!selectedDate || !availabilityData) {
      return [];
    }

    return generateAvailableTimeSlots({
      date: selectedDate,
      availabilities: availabilityData.availabilities,
      blockedSlots: availabilityData.blockedSlots,
      appointments: availabilityData.upcomingAppointments,
      uiLanguage: i18n.language,
    });
  }, [availabilityData, i18n.language, selectedDate]);

  const selectedSlot =
    availableSlotsForSelectedDate.find((slot) => slot.iso === selectedSlotIso) ?? null;

  const monthDateAvailability = useMemo(() => {
    if (!availabilityData) {
      return new Map<string, number>();
    }

    return getMonthDays(currentMonth).reduce<Map<string, number>>((map, date) => {
      if (!date || isPastDate(date)) {
        return map;
      }

      const slots = generateAvailableTimeSlots({
        date,
        availabilities: availabilityData.availabilities,
        blockedSlots: availabilityData.blockedSlots,
        appointments: availabilityData.upcomingAppointments,
        uiLanguage: i18n.language,
      });

      map.set(date.toDateString(), slots.length);
      return map;
    }, new Map());
  }, [availabilityData, currentMonth, i18n.language]);

  const handleDoctorSelection = (doctorId: string) => {
    if (isRescheduling || isDoctorSelectionLocked) {
      return;
    }

    setSelectedDoctorId(doctorId);
    setSelectedDate(null);
    setSelectedSlotIso(null);
    setFeedback(null);
  };

  const handleDateSelection = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlotIso(null);
    setFeedback(null);
  };

  const handleBooking = async () => {
    if (!user || !selectedDoctor || !selectedDate || !selectedSlot) {
      setFeedback({ type: 'error', message: t('patient.book.errPickSlot') });
      return;
    }

    if (isRescheduling && !rescheduleAppointment) {
      setFeedback({ type: 'error', message: t('patient.book.errRescheduleLoad') });
      return;
    }

    if (!chiefComplaint.trim()) {
      setFeedback({ type: 'error', message: t('patient.book.errReason') });
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);

    try {
      const bookingResult = isRescheduling
        ? await supabase.rpc('reschedule_patient_appointment', {
            p_appointment_id: rescheduleAppointment?.id,
            p_scheduled_at: selectedSlot.iso,
            p_duration_minutes: selectedSlot.durationMinutes,
            p_chief_complaint: chiefComplaint.trim(),
            p_notes: notes.trim(),
          })
        : await (async () => {
            // Look up doctor's facility
            let doctorFacilityId: string | null = null;
            const { data: staffData } = await supabase
              .from('facility_staff')
              .select('facility_id')
              .eq('doctor_user_id', selectedDoctor.userId)
              .eq('is_active', true)
              .eq('invitation_status', 'accepted')
              .maybeSingle();
            doctorFacilityId = staffData?.facility_id ?? null;

            return supabase
              .from('appointments')
              .insert({
                patient_id: user.id,
                doctor_id: selectedDoctor.userId,
                facility_id: doctorFacilityId,
                type: appointmentType,
                status: 'scheduled',
                scheduled_at: selectedSlot.iso,
                duration_minutes: selectedSlot.durationMinutes,
                chief_complaint: chiefComplaint.trim(),
                notes: notes.trim() || null,
              })
              .select('id')
              .single();
          })()

      if (bookingResult.error) {
        setFeedback({ type: 'error', message: bookingResult.error.message });
        return;
      }

      const appointmentId = isRescheduling
        ? rescheduleAppointment?.id ?? null
        : bookingResult.data?.id ?? null;

      if (appointmentId && !isRescheduling) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'appointment',
          title: '📅 Appointment confirmed!',
          body: `Your appointment with ${selectedDoctor.fullName} has been confirmed for ${new Date(selectedSlot.iso).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${new Date(selectedSlot.iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}.`,
          action_url: '/patient/appointments',
        });

        // Notify clinic staff
        const { data: staffData } = await supabase
          .from('facility_staff')
          .select('facility_id')
          .eq('doctor_user_id', selectedDoctor.userId)
          .eq('is_active', true)
          .eq('invitation_status', 'accepted')
          .maybeSingle();

        if (staffData?.facility_id) {
          const apptDateStr = new Date(selectedSlot.iso).toLocaleDateString('en-AE', { weekday: 'short', month: 'short', day: 'numeric' });
          const apptTimeStr = new Date(selectedSlot.iso).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false });
          await notifyClinicStaff(
            staffData.facility_id,
            '📅 New Appointment Booked',
            `A patient has booked an appointment with ${selectedDoctor.fullName} on ${apptDateStr} at ${apptTimeStr}.`
          );
        }
      }

      if (appointmentId && isRescheduling) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'appointment',
          title: '📅 Appointment rescheduled!',
          body: `Your appointment with ${selectedDoctor.fullName} has been rescheduled to ${new Date(selectedSlot.iso).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${new Date(selectedSlot.iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}.`,
          action_url: '/patient/appointments',
        });

        // Notify clinic staff
        const { data: rescheduleStaffData } = await supabase
          .from('facility_staff')
          .select('facility_id')
          .eq('doctor_user_id', selectedDoctor.userId)
          .eq('is_active', true)
          .eq('invitation_status', 'accepted')
          .maybeSingle();

        if (rescheduleStaffData?.facility_id) {
          const apptDateStr = new Date(selectedSlot.iso).toLocaleDateString('en-AE', { weekday: 'short', month: 'short', day: 'numeric' });
          const apptTimeStr = new Date(selectedSlot.iso).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false });
          await notifyClinicStaff(
            rescheduleStaffData.facility_id,
            '🔄 Appointment Rescheduled',
            `A patient rescheduled their appointment with ${selectedDoctor.fullName} to ${apptDateStr} at ${apptTimeStr}.`
          );
        }
      }

      if (appointmentId && !isRescheduling) {
        const { data: preVisitAssessment, error: preVisitAssessmentError } = await supabase
          .from('appointment_pre_visit_assessments')
          .select('id')
          .eq('appointment_id', appointmentId)
          .maybeSingle();

        if (preVisitAssessmentError) {
          setFeedback({ type: 'error', message: preVisitAssessmentError.message });
          return;
        }

        if (preVisitAssessment?.id) {
          navigate(`/patient/pre-visit/${preVisitAssessment.id}`, {
            replace: true,
          });
          return;
        }
      }

      navigate(`/patient/appointments?${isRescheduling ? 'rescheduled=1' : 'booked=1'}`, {
        replace: true,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : t('patient.book.errReason'),
      });
    } finally {
      // Always release the submit lock — previously a throw between
      // setIsSubmitting(true) and the explicit setIsSubmitting(false) below
      // left the button perpetually disabled.
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div>
        <button
          type="button"
          onClick={() => navigate('/patient/appointments')}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('patient.appointments.title')}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          {isRescheduling ? t('patient.book.titleReschedule') : t('patient.book.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isRescheduling ? t('patient.book.subReschedule') : t('patient.book.sub')}
        </p>
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

        {doctorsError ? (
          <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t('patient.book.doctorsError')}
          </div>
        ) : null}

        {specializationsError ? (
          <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t('patient.book.specError')}
          </div>
        ) : null}

        {rescheduleError ? (
          <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t('patient.book.rescheduleLoadError')}
          </div>
        ) : null}

        {availabilityError ? (
          <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t('patient.book.availabilityError')}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              {isRescheduling || isDoctorSelectionLocked
                ? t('patient.book.currentDoctor')
                : t('patient.book.chooseDoctor')}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {isRescheduling
                ? t('patient.book.rescheduleDoctorSub')
                : isDoctorSelectionLocked
                  ? t('patient.book.messageDoctorSub')
                  : t('patient.book.chooseDoctorSub')}
            </p>

            {isRescheduling && rescheduleAppointment ? (
              <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
                {t('patient.book.currentAppt')}{' '}
                {new Date(rescheduleAppointment.scheduled_at).toLocaleString(
                  locale,
                  dtOpts({
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                )}
              </div>
            ) : isDoctorSelectionLocked ? (
              <div className="mt-6 space-y-3">
                {doctorsLoading ? (
                  <Skeleton className="h-28 w-full rounded-2xl" />
                ) : selectedDoctor ? (
                  <div className="w-full rounded-2xl border border-cyan-400 bg-cyan-50 p-4 text-left shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{selectedDoctor.fullName}</p>
                        <p className="mt-1 text-sm text-cyan-700">
                          {selectedDoctor.specialty ?? t('shared.generalPractice')}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                          {[selectedDoctor.city, selectedDoctor.address].filter(Boolean).join(' • ') ||
                            t('shared.clinicTbd')}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
                        {selectedDoctor.activeAvailabilityCount === 1
                          ? t('shared.windowOne', { count: selectedDoctor.activeAvailabilityCount })
                          : t('shared.windowMany', { count: selectedDoctor.activeAvailabilityCount })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <Stethoscope className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                    <p className="font-semibold text-gray-900">{t('patient.book.noDoctors')}</p>
                    <p className="mt-1 text-sm text-gray-600">{t('patient.book.noDoctorsSub')}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-gray-700">{t('patient.book.search')}</span>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-4" />
                      <input
                        type="text"
                        value={searchTerm}
                        maxLength={FORM_FIELD_LIMITS.searchQuery}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder={t('patient.book.searchPh')}
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-gray-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 rtl:pl-4 rtl:pr-11"
                      />
                    </div>
                  </label>

                  <SpecializationMultiSelect
                    label={t('patient.book.specialty')}
                    options={specializationOptions}
                    selectedIds={selectedSpecializationIds}
                    onChange={setSelectedSpecializationIds}
                    selectionMode="single"
                    loading={specializationsLoading}
                    placeholder={t('patient.book.specSearchPh')}
                    helperText={t('patient.book.specHelper')}
                  />
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    {t('patient.book.matching')}
                  </div>
                  <div className="space-y-3">
                    {doctorsLoading || (isRescheduling && rescheduleLoading) ? (
                      <>
                        <Skeleton className="h-28 w-full rounded-2xl" />
                        <Skeleton className="h-28 w-full rounded-2xl" />
                        <Skeleton className="h-28 w-full rounded-2xl" />
                      </>
                    ) : filteredDoctors.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                        <Stethoscope className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                        <p className="font-semibold text-gray-900">{t('patient.book.noDoctors')}</p>
                        <p className="mt-1 text-sm text-gray-600">{t('patient.book.noDoctorsSub')}</p>
                      </div>
                    ) : (
                      filteredDoctors.map((doctor) => {
                        const isSelected = doctor.userId === selectedDoctorId;
                        return (
                          <button
                            key={doctor.userId}
                            type="button"
                            onClick={() => handleDoctorSelection(doctor.userId)}
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-lg font-semibold text-gray-900">{doctor.fullName}</p>
                                <p className="mt-1 text-sm text-cyan-700">
                                  {doctor.specialty ?? t('shared.generalPractice')}
                                </p>
                                <p className="mt-2 text-sm text-gray-600">
                                  {[doctor.city, doctor.address].filter(Boolean).join(' • ') || t('shared.clinicTbd')}
                                </p>
                              </div>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
                                {doctor.activeAvailabilityCount === 1
                                  ? t('shared.windowOne', { count: doctor.activeAvailabilityCount })
                                  : t('shared.windowMany', { count: doctor.activeAvailabilityCount })}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {isRescheduling ? (
              <div className="mt-6 space-y-3">
                {doctorsLoading || rescheduleLoading ? (
                  <>
                    <Skeleton className="h-28 w-full rounded-2xl" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                  </>
                ) : filteredDoctors.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <Stethoscope className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                    <p className="font-semibold text-gray-900">{t('patient.book.noDoctors')}</p>
                    <p className="mt-1 text-sm text-gray-600">{t('patient.book.noDoctorsSub')}</p>
                  </div>
                ) : (
                  filteredDoctors.map((doctor) => {
                    const isSelected = doctor.userId === selectedDoctorId;
                    return (
                      <button
                        key={doctor.userId}
                        type="button"
                        onClick={() => handleDoctorSelection(doctor.userId)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-lg font-semibold text-gray-900">{doctor.fullName}</p>
                            <p className="mt-1 text-sm text-cyan-700">
                              {doctor.specialty ?? t('shared.generalPractice')}
                            </p>
                            <p className="mt-2 text-sm text-gray-600">
                              {[doctor.city, doctor.address].filter(Boolean).join(' • ') || t('shared.clinicTbd')}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
                            {doctor.activeAvailabilityCount === 1
                              ? t('shared.windowOne', { count: doctor.activeAvailabilityCount })
                              : t('shared.windowMany', { count: doctor.activeAvailabilityCount })}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">{t('patient.book.pickSlot')}</h2>
            <p className="mt-1 text-sm text-gray-600">{t('patient.book.pickSlotSub')}</p>

            {!selectedDoctor ? (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <Calendar className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                <p className="font-semibold text-gray-900">{t('patient.book.chooseDoctorFirst')}</p>
                <p className="mt-1 text-sm text-gray-600">{t('patient.book.chooseDoctorFirstSub')}</p>
              </div>
            ) : (
              <>
                <div className="mt-6 rounded-2xl bg-cyan-50 p-4">
                  <p className="text-lg font-semibold text-gray-900">{selectedDoctor.fullName}</p>
                  <p className="mt-1 text-sm text-cyan-700">
                    {selectedDoctor.specialty ?? t('shared.generalPractice')}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {[selectedDoctor.city, selectedDoctor.address].filter(Boolean).join(' • ') ||
                        t('shared.clinicAfterBooking')}
                    </span>
                  </p>
                </div>

                {availabilityLoading ? (
                  <div className="mt-6 space-y-4">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-72 w-full rounded-2xl" />
                  </div>
                ) : (
                  <>
                    <div className="mt-6 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentMonth(
                            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                          )
                        }
                        className="rounded-lg p-2 transition hover:bg-gray-100"
                        aria-label={t('patient.book.previousMonth', { defaultValue: 'Previous month' })}
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-700" />
                      </button>
                      <h3 className="font-semibold text-gray-900">
                        {currentMonth.toLocaleDateString(locale, dtOpts({ month: 'long', year: 'numeric' }))}
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentMonth(
                            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                          )
                        }
                        className="rounded-lg p-2 transition hover:bg-gray-100"
                        aria-label={t('patient.book.nextMonth', { defaultValue: 'Next month' })}
                      >
                        <ChevronRight className="h-5 w-5 text-gray-700" />
                      </button>
                    </div>

                    <div className="mt-4 rounded-2xl border border-gray-200 p-4">
                      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-500">
                        {weekdayLabels.map((label) => (
                          <div key={label} className="py-2">
                            {label}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {getMonthDays(currentMonth).map((date, index) => {
                          if (!date) {
                            return <div key={`empty-${index}`} className="aspect-square" />;
                          }

                          const isPast = isPastDate(date);
                          const slotCount = monthDateAvailability.get(date.toDateString()) ?? 0;
                          const isSelected = selectedDate?.toDateString() === date.toDateString();
                          const isAvailable = !isPast && slotCount > 0;

                          return (
                            <button
                              key={date.toISOString()}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => handleDateSelection(date)}
                              className={`aspect-square rounded-xl border text-sm font-semibold transition ${
                                isSelected
                                  ? 'border-cyan-500 bg-cyan-500 text-white'
                                  : isAvailable
                                    ? 'border-gray-200 bg-white text-gray-900 hover:border-cyan-300 hover:bg-cyan-50'
                                    : 'border-gray-100 bg-gray-50 text-gray-300'
                              }`}
                            >
                              {formatLocaleDigits(date.getDate(), i18n.language)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="font-semibold text-gray-900">{t('patient.book.slotsTitle')}</h3>
                      {selectedDate ? (
                        <p className="mt-1 text-sm text-gray-600">
                          {selectedDate.toLocaleDateString(
                            locale,
                            dtOpts({
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          )}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-gray-600">{t('patient.book.selectDateHint')}</p>
                      )}

                      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {selectedDate && availableSlotsForSelectedDate.length > 0 ? (
                          availableSlotsForSelectedDate.map((slot) => (
                            <button
                              key={slot.iso}
                              type="button"
                              onClick={() => setSelectedSlotIso(slot.iso)}
                              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                                selectedSlotIso === slot.iso
                                  ? 'border-cyan-500 bg-cyan-500 text-white'
                                  : 'border-gray-200 bg-white text-gray-800 hover:border-cyan-300 hover:bg-cyan-50'
                              }`}
                            >
                              {slot.label}
                            </button>
                          ))
                        ) : (
                          <div className="sm:col-span-3 lg:col-span-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                            <Clock className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                            <p className="font-semibold text-gray-900">{t('patient.book.noSlots')}</p>
                            <p className="mt-1 text-sm text-gray-600">{t('patient.book.noSlotsSub')}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        {t('patient.book.appointmentType', { defaultValue: 'Appointment Type' })}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setAppointmentType('in_person')}
                          className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-semibold transition ${
                            appointmentType === 'in_person'
                              ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-cyan-300 hover:bg-cyan-50/50'
                          }`}
                        >
                          <MapPin className="h-5 w-5" />
                          {t('patient.appointments.filterInPerson', { defaultValue: 'In Person' })}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppointmentType('virtual')}
                          className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-semibold transition ${
                            appointmentType === 'virtual'
                              ? 'border-violet-500 bg-violet-50 text-violet-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300 hover:bg-violet-50/50'
                          }`}
                        >
                          <Video className="h-5 w-5" />
                          {t('patient.appointments.filterTeleconsult', { defaultValue: 'Teleconsult' })}
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-gray-700">{t('patient.book.reasonLabel')}</span>
                        <textarea
                          value={chiefComplaint}
                          onChange={(event) => setChiefComplaint(event.target.value)}
                          rows={4}
                          maxLength={500}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                          placeholder={t('patient.book.reasonPh')}
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-gray-700">{t('patient.book.notesLabel')}</span>
                        <textarea
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          rows={3}
                          maxLength={2000}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                          placeholder={t('patient.book.notesPh')}
                        />
                      </label>
                    </div>

                    <div className="mt-6 rounded-2xl bg-gray-50 p-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {isRescheduling ? t('patient.book.summaryReschedule') : t('patient.book.summaryBook')}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        {selectedDoctor.fullName}
                        {selectedSlot
                          ? ` • ${new Date(selectedSlot.iso).toLocaleString(
                              locale,
                              dtOpts({
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            )}`
                          : ` • ${t('patient.book.selectDateTime')}`}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          if (chiefComplaint.trim() || notes.trim() || selectedSlot) {
                            setShowCancelWarning(true);
                          } else {
                            navigate('/patient/appointments');
                          }
                        }}
                        className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        {t('patient.book.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        disabled={isSubmitting || !selectedSlot || !chiefComplaint.trim()}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ceenai-navy via-ceenai-blue to-ceenai-cyan px-5 py-3 font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>
                          {isRescheduling
                            ? t('patient.book.confirmReschedule')
                            : t('patient.book.confirmBook')}
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      </div>
      {showCancelWarning ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCancelWarning(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-slate-900">
                Discard booking?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                You have unsaved information. Are you sure you want to leave? Your changes will be lost.
              </p>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowCancelWarning(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => navigate('/patient/appointments')}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Discard
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
      {showConfirmModal && selectedSlot && selectedDoctor ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                <h2 className="text-base font-semibold text-slate-900">
                  {isRescheduling ? 'Confirm Reschedule' : 'Confirm Booking'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-4">
              <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Doctor</span>
                  <span className="font-semibold text-slate-800">{selectedDoctor.fullName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Specialty</span>
                  <span className="font-semibold text-slate-800">
                    {selectedDoctor.specialty ?? t('shared.generalPractice')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Date & Time</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedSlot.iso).toLocaleString(locale, dtOpts({
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    }))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Type</span>
                  <span className="font-semibold text-slate-800">
                    {appointmentType === 'virtual'
                      ? t('patient.appointments.filterTeleconsult', { defaultValue: 'Teleconsult' })
                      : t('patient.appointments.filterInPerson', { defaultValue: 'In Person' })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-semibold text-slate-800">
                    {t('shared.minutesUnit', { count: selectedSlot.durationMinutes })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Reason</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[60%] truncate">
                    {chiefComplaint}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={async () => {
                  setShowConfirmModal(false);
                  await handleBooking();
                }}
                className="flex-1 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Booking...' : isRescheduling ? 'Confirm Reschedule' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
};

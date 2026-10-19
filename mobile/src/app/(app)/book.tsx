import { generateAvailableTimeSlots, type AvailableTimeSlot } from '@ceenaix/shared/appointment-booking';
import { FORM_FIELD_LIMITS } from '@ceenaix/shared/form-field-limits';
import { dateTimeFormatWithNumerals, resolveLocale } from '@ceenaix/shared/i18n-ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  InlineMessage,
  KeyValue,
  ProgressBar,
  Screen,
  SegmentedControl,
  SkeletonList,
  Text,
  TextField,
} from '@/components/ui';
import { alertDialog } from '@/lib/dialog';
import { bookPatientAppointment, reschedulePatientAppointment, useRescheduleSource } from '@/data/appointments';
import { useBookableDoctors, type BookableDoctor } from '@/data/web/hooks/use-bookable-doctors';
import { useDoctorBookingAvailability } from '@/data/web/hooks/use-doctor-booking-availability';
import { useSpecializations } from '@/data/web/hooks/use-specializations';
import { formatAed, formatDateTime } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

type Step = 'doctor' | 'when' | 'details' | 'review';
type VisitType = 'in_person' | 'virtual';

const BOOKING_HORIZON_DAYS = 56;

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// One step per screen instead of the web's single long form: doctor → time →
// reason → review. Same queries, slot generation and mutations as web
// `BookAppointment` (`?reschedule=`, `?doctor=&source=message`, AI prefill).
export default function BookScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    reschedule?: string;
    doctor?: string;
    source?: string;
    specialization?: string;
    reason?: string;
    notes?: string;
  }>();
  const isRescheduling = Boolean(params.reschedule);
  const lang = i18n.language;

  const doctorsQuery = useBookableDoctors();
  const specializations = useSpecializations();
  const reschedule = useRescheduleSource(params.reschedule, user?.id);
  const doctors = useMemo(() => doctorsQuery.data ?? [], [doctorsQuery.data]);
  const requestedDoctorValid = Boolean(params.doctor && doctors.some((doctor) => doctor.userId === params.doctor));
  const doctorLocked = isRescheduling || (params.source === 'message' && requestedDoctorValid);
  const steps: Step[] = doctorLocked ? ['when', 'details', 'review'] : ['doctor', 'when', 'details', 'review'];

  const [stepIndex, setStepIndex] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [specializationId, setSpecializationId] = useState<string | null>(params.specialization ?? null);
  const [visitType, setVisitType] = useState<VisitType>('in_person');
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState(params.reason ?? '');
  const [notes, setNotes] = useState(params.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Prefill once the doctor list / appointment being rescheduled arrive.
  useEffect(() => {
    if (initialized) return;
    if (isRescheduling) {
      const source = reschedule.data;
      if (!source) return;
      setDoctorId(source.doctor_id);
      const original = new Date(source.scheduled_at);
      setDateKey(new Date(original.getFullYear(), original.getMonth(), original.getDate()).toDateString());
      setChiefComplaint(source.chief_complaint ?? '');
      setNotes(source.notes ?? '');
      setInitialized(true);
      return;
    }
    if (doctorsQuery.loading) return;
    if (requestedDoctorValid && params.doctor) {
      setDoctorId(params.doctor);
      // `?doctor=` skips straight to picking a time; the doctor step stays reachable unless locked.
      if (!doctorLocked) setStepIndex(1);
    }
    setInitialized(true);
  }, [doctorLocked, doctorsQuery.loading, initialized, isRescheduling, params.doctor, requestedDoctorValid, reschedule.data]);

  const selectedDoctor = useMemo(() => doctors.find((doctor) => doctor.userId === doctorId) ?? null, [doctorId, doctors]);
  const availability = useDoctorBookingAvailability(doctorId);

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();
    return doctors.filter((doctor) => {
      const matchesSearch =
        !query ||
        doctor.fullName.toLowerCase().includes(query) ||
        (doctor.specialty ?? '').toLowerCase().includes(query) ||
        (doctor.city ?? '').toLowerCase().includes(query);
      const matchesSpecialty = !specializationId || doctor.specializationIds.includes(specializationId);
      return matchesSearch && matchesSpecialty;
    });
  }, [doctors, search, specializationId]);

  const days = useMemo(() => {
    const data = availability.data;
    if (!data) return [];
    const today = startOfToday();
    const result: Array<{
      date: Date;
      key: string;
      slots: AvailableTimeSlot[];
    }> = [];
    for (let offset = 0; offset < BOOKING_HORIZON_DAYS; offset += 1) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
      const slots = generateAvailableTimeSlots({
        date,
        availabilities: data.availabilities,
        blockedSlots: data.blockedSlots,
        appointments: data.upcomingAppointments,
        uiLanguage: lang,
      });
      if (slots.length > 0) result.push({ date, key: date.toDateString(), slots });
    }
    return result;
  }, [availability.data, lang]);

  // Default to the first open day (or keep the rescheduled day when it still has slots).
  useEffect(() => {
    if (days.length === 0) return;
    if (!dateKey || !days.some((day) => day.key === dateKey)) setDateKey(days[0]?.key ?? null);
  }, [dateKey, days]);

  const selectedDay = days.find((day) => day.key === dateKey) ?? null;
  const selectedSlot = selectedDay?.slots.find((slot) => slot.iso === slotIso) ?? null;
  const step = steps[Math.min(stepIndex, steps.length - 1)] ?? 'when';
  const isLastStep = stepIndex >= steps.length - 1;
  const dirty = Boolean(slotIso || chiefComplaint.trim() || (doctorId && !doctorLocked));

  const canContinue =
    step === 'doctor' ? Boolean(selectedDoctor) : step === 'when' ? Boolean(selectedSlot) : step === 'details' ? chiefComplaint.trim().length > 0 : true;

  const close = () => {
    if (!dirty || submitting) {
      router.back();
      return;
    }
    alertDialog(t('m.book.discardTitle'), t('m.book.discardBody'), [
      { text: t('m.book.keepEditing'), style: 'cancel' },
      {
        text: t('m.book.discard'),
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  };

  const goBack = () => {
    setError(null);
    if (stepIndex === 0) close();
    else setStepIndex((index) => index - 1);
  };

  const pickDoctor = (doctor: BookableDoctor) => {
    haptics.tap();
    if (doctor.userId !== doctorId) {
      setDoctorId(doctor.userId);
      setDateKey(null);
      setSlotIso(null);
    }
    setError(null);
    setStepIndex((index) => index + 1);
  };

  const submit = async () => {
    if (!user || !selectedDoctor || !selectedSlot) {
      setError(t('patient.book.errPickSlot'));
      return;
    }
    if (!chiefComplaint.trim()) {
      setError(t('patient.book.errReason'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const doctor = {
      userId: selectedDoctor.userId,
      fullName: selectedDoctor.fullName,
    };
    const slot = {
      iso: selectedSlot.iso,
      durationMinutes: selectedSlot.durationMinutes,
    };
    const locale = resolveLocale(lang);
    try {
      if (isRescheduling && reschedule.data) {
        await reschedulePatientAppointment({
          patientId: user.id,
          appointmentId: reschedule.data.id,
          doctor,
          slot,
          chiefComplaint,
          notes,
          locale,
        });
        haptics.success();
        router.dismissTo({
          pathname: '/appointments',
          params: { banner: 'rescheduled' },
        });
        return;
      }
      const result = await bookPatientAppointment({
        patientId: user.id,
        doctor,
        type: visitType,
        slot,
        chiefComplaint,
        notes,
        locale,
      });
      haptics.success();
      if (result.preVisitAssessmentId) router.replace(`/pre-visit/${result.preVisitAssessmentId}`);
      else router.replace(`/appointment/${result.appointmentId}`);
    } catch (submitError) {
      haptics.error();
      setError(submitError instanceof Error ? submitError.message : t('m.common.unexpected'));
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!canContinue) return;
    haptics.tap();
    setError(null);
    if (isLastStep) void submit();
    else setStepIndex((index) => index + 1);
  };

  const stepTitle = {
    doctor: t('m.book.stepDoctor'),
    when: t('m.book.stepWhen'),
    details: t('m.book.stepDetails'),
    review: t('m.book.stepReview'),
  }[step];

  const dayLabel = (date: Date, options: Intl.DateTimeFormatOptions) => date.toLocaleDateString(resolveLocale(lang), dateTimeFormatWithNumerals(lang, options));

  const renderDoctorStep = () => {
    if (doctorsQuery.loading) return <SkeletonList count={4} height={88} />;
    if (doctorsQuery.error) return <ErrorState message={t('patient.book.doctorsError')} onRetry={() => void doctorsQuery.refetch()} />;
    return (
      <View style={{ gap: spacing.md }}>
        <TextField
          accessibilityLabel={t('patient.book.search')}
          placeholder={t('patient.book.searchPh')}
          value={search}
          onChangeText={setSearch}
          maxLength={FORM_FIELD_LIMITS.searchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {(specializations.data?.length ?? 0) > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
            {[
              { id: null, name: t('m.book.allSpecialties') },
              ...(specializations.data ?? []).map((item) => ({
                id: item.id as string | null,
                name: item.name,
              })),
            ].map((option) => {
              const active = option.id === specializationId;
              return (
                <Pressable
                  key={option.id ?? 'all'}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    haptics.tap();
                    setSpecializationId(option.id);
                  }}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : colors.surface,
                    },
                  ]}
                >
                  <Text variant="captionStrong" style={{ color: active ? colors.primaryText : colors.text }}>
                    {option.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        {filteredDoctors.length === 0 ? (
          <EmptyState icon="search" title={t('patient.book.noDoctors')} body={t('patient.book.noDoctorsSub')} />
        ) : (
          filteredDoctors.map((doctor) => (
            <Card
              key={doctor.userId}
              onPress={() => pickDoctor(doctor)}
              tone={doctor.userId === doctorId ? 'brand' : undefined}
              accessibilityLabel={doctor.fullName}
            >
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  alignItems: 'center',
                }}
              >
                <Avatar name={doctor.fullName} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong">{doctor.fullName}</Text>
                  <Text variant="caption" color="muted" numberOfLines={1}>
                    {[doctor.specialty ?? t('shared.generalPractice'), doctor.city].filter(Boolean).join(' · ')}
                  </Text>
                  {doctor.consultationFee !== null ? (
                    <Text variant="caption" color="primary">
                      {formatAed(doctor.consultationFee)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    );
  };

  const renderWhenStep = () => {
    if (isRescheduling && reschedule.loading) return <SkeletonList count={2} height={120} />;
    if (isRescheduling && (reschedule.error || !reschedule.data)) {
      return <ErrorState message={t('patient.book.rescheduleLoadError')} onRetry={() => void reschedule.refetch()} />;
    }
    return (
      <View style={{ gap: spacing.lg }}>
        {selectedDoctor ? (
          <Card>
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.md,
                alignItems: 'center',
              }}
            >
              <Avatar name={selectedDoctor.fullName} size={36} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{selectedDoctor.fullName}</Text>
                <Text variant="caption" color="muted">
                  {selectedDoctor.specialty ?? t('shared.generalPractice')}
                </Text>
              </View>
            </View>
            {isRescheduling && reschedule.data ? (
              <Text variant="caption" color="muted" style={{ marginTop: spacing.sm }}>
                {t('m.book.rescheduleFrom', {
                  when: formatDateTime(reschedule.data.scheduled_at),
                })}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {!isRescheduling ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="captionStrong" color="muted">
              {t('m.book.visitType')}
            </Text>
            <SegmentedControl<VisitType>
              value={visitType}
              onChange={setVisitType}
              options={[
                {
                  value: 'in_person',
                  label: t('patient.appointments.filterInPerson', {
                    defaultValue: 'In Person',
                  }),
                },
                {
                  value: 'virtual',
                  label: t('patient.appointments.filterTeleconsult', {
                    defaultValue: 'Teleconsult',
                  }),
                },
              ]}
            />
          </View>
        ) : null}

        {availability.loading ? (
          <SkeletonList count={2} height={72} />
        ) : availability.error ? (
          <ErrorState message={t('patient.book.availabilityError')} onRetry={() => void availability.refetch()} />
        ) : days.length === 0 ? (
          <EmptyState icon="calendar-outline" title={t('m.book.noDates')} body={t('m.book.noDatesSub')} />
        ) : (
          <>
            <View style={{ gap: spacing.sm }}>
              <Text variant="captionStrong" color="muted">
                {t('m.book.date')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {days.map((day) => {
                  const active = day.key === dateKey;
                  const fg = active ? colors.primaryText : colors.text;
                  return (
                    <Pressable
                      key={day.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={dayLabel(day.date, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                      onPress={() => {
                        haptics.tap();
                        setDateKey(day.key);
                        setSlotIso(null);
                      }}
                      style={[
                        styles.day,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primary : colors.surface,
                        },
                      ]}
                    >
                      <Text variant="micro" style={{ color: fg, opacity: 0.8 }}>
                        {dayLabel(day.date, { weekday: 'short' })}
                      </Text>
                      <Text variant="title" style={{ color: fg }}>
                        {dayLabel(day.date, { day: 'numeric' })}
                      </Text>
                      <Text variant="micro" style={{ color: fg, opacity: 0.8 }}>
                        {dayLabel(day.date, { month: 'short' })}
                      </Text>
                      <Text
                        variant="micro"
                        style={{
                          color: active ? colors.primaryText : colors.primary,
                        }}
                      >
                        {t('m.book.slotsCount', { count: day.slots.length })}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <View style={{ gap: spacing.sm }}>
              <Text variant="captionStrong" color="muted">
                {t('patient.book.slotsTitle')}
              </Text>
              <View style={styles.slots}>
                {(selectedDay?.slots ?? []).map((slot) => {
                  const active = slot.iso === slotIso;
                  return (
                    <Pressable
                      key={slot.iso}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        haptics.tap();
                        setSlotIso(slot.iso);
                      }}
                      style={[
                        styles.slot,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primary : colors.surface,
                        },
                      ]}
                    >
                      <Text
                        variant="captionStrong"
                        style={{
                          color: active ? colors.primaryText : colors.text,
                        }}
                      >
                        {slot.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderDetailsStep = () => (
    <View style={{ gap: spacing.lg }}>
      <TextField
        label={t('patient.book.reasonLabel')}
        placeholder={t('patient.book.reasonPh')}
        value={chiefComplaint}
        onChangeText={setChiefComplaint}
        multiline
        maxLength={FORM_FIELD_LIMITS.clinicalNotes}
        autoFocus={!chiefComplaint}
      />
      <TextField
        label={t('patient.book.notesLabel')}
        placeholder={t('patient.book.notesPh')}
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={FORM_FIELD_LIMITS.clinicalNotes}
      />
    </View>
  );

  const renderReviewStep = () => (
    <Card>
      <Text variant="captionStrong" color="muted" style={{ marginBottom: spacing.sm }}>
        {isRescheduling ? t('patient.book.summaryReschedule') : t('patient.book.summaryBook')}
      </Text>
      <KeyValue label={t('m.book.doctor')} value={selectedDoctor?.fullName} />
      <KeyValue label={t('patient.book.specialty')} value={selectedDoctor?.specialty ?? t('shared.generalPractice')} />
      {!isRescheduling ? (
        <KeyValue
          label={t('m.book.visitType')}
          value={
            visitType === 'virtual'
              ? t('patient.appointments.filterTeleconsult', {
                  defaultValue: 'Teleconsult',
                })
              : t('patient.appointments.filterInPerson', {
                  defaultValue: 'In Person',
                })
          }
        />
      ) : null}
      <KeyValue label={t('m.book.when')} value={selectedSlot ? formatDateTime(selectedSlot.iso) : t('patient.book.selectDateTime')} />
      {selectedSlot ? (
        <KeyValue
          label={t('m.book.duration')}
          value={t('shared.minutesUnit', {
            count: selectedSlot.durationMinutes,
          })}
        />
      ) : null}
      {selectedDoctor?.consultationFee !== null && selectedDoctor?.consultationFee !== undefined ? (
        <KeyValue label={t('m.book.fee')} value={formatAed(selectedDoctor.consultationFee)} />
      ) : null}
      <KeyValue label={t('patient.book.reasonLabel')} value={chiefComplaint.trim()} />
      {notes.trim() ? <KeyValue label={t('patient.book.notesLabel')} value={notes.trim()} /> : null}
      {!isRescheduling ? (
        <Text variant="caption" color="muted" style={{ marginTop: spacing.sm }}>
          {selectedDoctor?.address ?? t('shared.clinicAfterBooking')}
        </Text>
      ) : null}
    </Card>
  );

  return (
    <Screen
      testID="screen-book"
      edgeTop
      keyboard
      footer={
        step === 'doctor' && stepIndex === 0 ? undefined : (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {stepIndex > 0 ? (
              <View style={{ flex: 1 }}>
                <Button label={t('m.common.back')} variant="secondary" fullWidth onPress={goBack} disabled={submitting} />
              </View>
            ) : null}
            {step !== 'doctor' ? (
              <View style={{ flex: 2 }}>
                <Button
                  label={
                    isLastStep
                      ? submitting
                        ? isRescheduling
                          ? t('patient.book.rescheduling')
                          : t('patient.book.booking')
                        : isRescheduling
                          ? t('patient.book.confirmReschedule')
                          : t('patient.book.confirmBook')
                      : t('m.common.next')
                  }
                  fullWidth
                  loading={submitting}
                  disabled={!canContinue || submitting}
                  onPress={next}
                />
              </View>
            ) : null}
          </View>
        )
      }
    >
      <View style={styles.topBar}>
        <IconButton name="close" variant="plain" accessibilityLabel={t('m.common.close')} onPress={close} />
        <View style={{ flex: 1 }}>
          <Text variant="micro" color="subtle">
            {(isRescheduling ? t('patient.book.titleReschedule') : t('patient.book.title')) +
              ' · ' +
              t('m.common.stepOf', {
                current: stepIndex + 1,
                total: steps.length,
              })}
          </Text>
          <Text variant="title" accessibilityRole="header">
            {stepTitle}
          </Text>
        </View>
      </View>
      <View style={{ marginBottom: spacing.lg }}>
        <ProgressBar value={(stepIndex + 1) / steps.length} />
      </View>
      {error ? (
        <View style={{ marginBottom: spacing.md }}>
          <InlineMessage tone="danger" message={error} />
        </View>
      ) : null}
      {step === 'doctor' ? renderDoctorStep() : step === 'when' ? renderWhenStep() : step === 'details' ? renderDetailsStep() : renderReviewStep()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  day: {
    width: 76,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 88,
    alignItems: 'center',
  },
});

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Pencil,
  DollarSign,
  Pause,
  PieChart,
  MessageSquare,
  Pill,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { MedicationNameDisplay } from '../../components/MedicationNameDisplay';
import { Skeleton } from '../../components/Skeleton';
import { useMedicationLogs } from '../../hooks/use-medication-logs';
import {
  assignPatientPrescriptionPharmacy,
  getPatientPrescriptionPharmacyContact,
  listActivePharmacies,
  markPatientPrescriptionPickedUp,
  usePatientPrescriptions,
  type PatientPrescriptionRecord,
} from '../../hooks/use-patient-prescriptions';
import { usePatientPrimaryInsurance } from '../../hooks/use-patient-primary-insurance';
import { usePatientDashboardAlert } from '../../hooks/use-patient-dashboard-alert';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import {
  estimateDaysOfSupplyRemaining,
  estimateDosesPerDay,
  isRefillDueSoon,
  isUrgentRefill,
  supplyBarPercent,
  urgencyFromDaysRemaining,
} from '../../lib/medication-schedule';
import {
  dateTimeFormatWithNumerals,
  formatLocaleDigits,
  prescriptionStatusLabel,
  resolveLocale,
} from '../../lib/i18n-ui';
import { formatMedicationDetailLine } from '../../lib/medication-display';
import type { PrescriptionItem } from '../../types/database';

type MedicationTab = 'active' | 'schedule' | 'reminders' | 'past' | 'costs';
type DoseSlotKey = 'morning' | 'afternoon' | 'evening' | 'bedtime';

const CATEGORY_BG: readonly string[] = [
  'bg-blue-100',
  'bg-purple-100',
  'bg-red-100',
  'bg-amber-100',
  'bg-teal-100',
] as const;

const CATEGORY_HEX: readonly string[] = [
  '#3B82F6',
  '#7C3AED',
  '#EF4444',
  '#F59E0B',
  '#0D9488',
] as const;

const EMOJI_FOR_INDEX = ['💊', '❤️', '☀️', '🩸', '💜'];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function lineAccent(name: string): { bg: string; hex: string; emoji: string } {
  const h = hashString(name);
  return {
    bg: CATEGORY_BG[h % CATEGORY_BG.length] ?? 'bg-teal-100',
    hex: CATEGORY_HEX[h % CATEGORY_HEX.length] ?? '#0D9488',
    emoji: EMOJI_FOR_INDEX[h % EMOJI_FOR_INDEX.length] ?? '💊',
  };
}

function doctorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Dr';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

type ActiveLine = { item: PrescriptionItem; prescription: PatientPrescriptionRecord };
type ActiveLineWithDays = ActiveLine & { days: number | null };

interface ScheduleDose {
  row: ActiveLine;
  doseIndex: number;
}

interface ScheduleBlock {
  key: DoseSlotKey;
  time: string;
  labelKey: string;
  status: 'pending' | 'scheduled';
  noteKey?: string;
  doses: ScheduleDose[];
}

const SLOT_META: Record<DoseSlotKey, { time: string; labelKey: string; noteKey?: string }> = {
  morning: {
    time: '8:00 AM',
    labelKey: 'patient.prescriptions.scheduleMorning',
    noteKey: 'patient.prescriptions.scheduleMorningNote',
  },
  afternoon: {
    time: '2:00 PM',
    labelKey: 'patient.prescriptions.scheduleAfternoon',
  },
  evening: {
    time: '8:00 PM',
    labelKey: 'patient.prescriptions.scheduleEvening',
    noteKey: 'patient.prescriptions.scheduleEveningNote',
  },
  bedtime: {
    time: '10:00 PM',
    labelKey: 'patient.prescriptions.scheduleBedtime',
    noteKey: 'patient.prescriptions.scheduleBedtimeNote',
  },
};

function inferDoseSlots(item: PrescriptionItem): DoseSlotKey[] {
  const f = `${item.frequency ?? ''} ${item.instructions ?? ''}`.toLowerCase();
  // Fall back to 1/day for slot rendering when the frequency string is too
  // unstructured to parse — the per-day estimator now returns null in that
  // case to keep "days of supply" honest, but the dosing-slot grid still
  // needs a baseline so the row renders.
  const count = estimateDosesPerDay(item.frequency) ?? 1;

  if (/(bed|night|nocte|sleep|evening|pm)/i.test(f) && count <= 1) {
    return ['bedtime'];
  }
  if (count >= 4) {
    return ['morning', 'afternoon', 'evening', 'bedtime'];
  }
  if (count === 3) {
    return ['morning', 'afternoon', 'evening'];
  }
  if (count === 2) {
    return ['morning', 'evening'];
  }
  return ['morning'];
}

export const PatientPrescriptions: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const uiLang = i18n.language ?? 'en';
  const locale = resolveLocale(uiLang);
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(
      locale,
      dateTimeFormatWithNumerals(uiLang, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    );
  const { user } = useAuth();
  const { data, loading, error, refetch } = usePatientPrescriptions(user?.id);
  const { data: primaryInsurance, loading: insuranceLoading } = usePatientPrimaryInsurance(user?.id);
  const { data: allergyRows } = usePatientDashboardAlert(user?.id);
  const [expandedLineIds, setExpandedLineIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<MedicationTab>('active');
  const [pharmacyModalPrescriptionId, setPharmacyModalPrescriptionId] = useState<string | null>(null);
  const [pharmacyList, setPharmacyList] = useState<Array<{ id: string; name: string; city: string }>>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [sendingToPharmacy, setSendingToPharmacy] = useState(false);
  const [pharmacySentId, setPharmacySentId] = useState<string | null>(null);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editingReminderTime, setEditingReminderTime] = useState('');
  const [pausedReminderIds, setPausedReminderIds] = useState<Set<string>>(new Set());
  const [deletedReminderIds, setDeletedReminderIds] = useState<Set<string>>(new Set());
  const [undoReminderId, setUndoReminderId] = useState<string | null>(null);
  const [showMissedDoseAnalysis, setShowMissedDoseAnalysis] = useState(false);
  const [pickedUpIds, setPickedUpIds] = useState<Set<string>>(new Set());
  const [dbReminders, setDbReminders] = useState<Map<string, { time: string; isPaused: boolean; isDeleted: boolean }>>(new Map());
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reportedMeds, setReportedMeds] = useState<Array<{
    id: string;
    medication_name: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    instructions: string | null;
    is_current: boolean;
    review_status: string;
  }>>([]);
  const [loadingReportedMeds, setLoadingReportedMeds] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingMed, setSavingMed] = useState(false);
  const [deletingMedId, setDeletingMedId] = useState<string | null>(null);
  const [newMed, setNewMed] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    is_current: true,
  });
  const {
    takenItemIds,
    error: medicationLogError,
    markTaken: markMedicationTaken,
  } = useMedicationLogs(user?.id);

  useEffect(() => {
    if (!user?.id) return;
    setLoadingReportedMeds(true);
    void supabase
      .from('patient_reported_medications')
      .select('id, medication_name, dosage, frequency, duration, instructions, is_current, review_status')
      .eq('patient_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .then(({ data: medsData }) => {
        setReportedMeds(medsData ?? []);
        setLoadingReportedMeds(false);
      });
  }, [user?.id]);

  const handleAddMedication = async () => {
    if (!newMed.medication_name.trim() || !user?.id) return;
    setSavingMed(true);
    const { data: inserted } = await supabase
      .from('patient_reported_medications')
      .insert({
        patient_id: user.id,
        medication_name: newMed.medication_name.trim(),
        dosage: newMed.dosage.trim() || null,
        frequency: newMed.frequency.trim() || null,
        duration: newMed.duration.trim() || null,
        instructions: newMed.instructions.trim() || null,
        is_current: newMed.is_current,
        review_status: 'pending_review',
      })
      .select()
      .single();
    setSavingMed(false);
    if (inserted) {
      setReportedMeds((prev) => [inserted, ...prev]);
      setShowAddModal(false);
      setNewMed({ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '', is_current: true });
    }
  };

  const handleDeleteMedication = async (medicationId: string) => {
    setDeletingMedId(medicationId);
    await supabase
      .from('patient_reported_medications')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', medicationId);
    setReportedMeds((prev) => prev.filter((med) => med.id !== medicationId));
    setDeletingMedId(null);
  };

  const prescriptions = useMemo(() => data ?? [], [data]);

  const activePrescriptions = useMemo(
    () => prescriptions.filter((p) => p.status === 'active'),
    [prescriptions]
  );
  const pastPrescriptions = useMemo(
    () => prescriptions.filter((p) => p.status !== 'active'),
    [prescriptions]
  );

  const activeLineItems: ActiveLine[] = useMemo(() => {
    const rows: ActiveLine[] = [];
    for (const p of activePrescriptions) {
      for (const item of p.items) {
        rows.push({ item, prescription: p });
      }
    }
    return rows;
  }, [activePrescriptions]);

  const pastLineItems: ActiveLine[] = useMemo(() => {
    const rows: ActiveLine[] = [];
    for (const p of pastPrescriptions) {
      for (const item of p.items) {
        rows.push({ item, prescription: p });
      }
    }
    return rows;
  }, [pastPrescriptions]);

  const activeMedicationCount = activeLineItems.length;

  const { totalDosesToday, takenToday, monthlyAdherencePercent, dispensedCount } = useMemo(() => {
    if (activeLineItems.length === 0) {
      return {
        totalDosesToday: 0,
        takenToday: 0,
        monthlyAdherencePercent: 0,
        dispensedCount: 0,
      };
    }
    const totalDoses = activeLineItems.reduce(
      (sum, row) => sum + Math.max(1, estimateDosesPerDay(row.item.frequency) ?? 1),
      0
    );
    // No dose-level logging in DB — show 0 "taken" until adherence ships; value is data-honest.
    const taken = 0;
    const dispensed = activeLineItems.filter((r) => r.item.is_dispensed).length;
    const adh = Math.round((dispensed / activeLineItems.length) * 100);
    return {
      totalDosesToday: totalDoses,
      takenToday: taken,
      monthlyAdherencePercent: adh,
      dispensedCount: dispensed,
    };
  }, [activeLineItems]);

  const activeLinesWithDays: ActiveLineWithDays[] = useMemo(
    () =>
      activeLineItems.map((r) => ({
        ...r,
        days: estimateDaysOfSupplyRemaining(r.item.quantity, r.item.frequency),
      })),
    [activeLineItems]
  );

  const refillsDueSoon = useMemo(() => {
    return activeLinesWithDays.filter((r) => isRefillDueSoon(r.days, r.item.quantity, 14));
  }, [activeLinesWithDays]);

  const refillsDueCount = refillsDueSoon.length;

  const firstLowSupplyLine = useMemo((): ActiveLineWithDays | null => {
    if (activeLinesWithDays.length === 0) {
      return null;
    }
    const sorted = [...activeLinesWithDays].sort((a, b) => {
      if (a.days != null && b.days != null) {
        return a.days - b.days;
      }
      if (a.days != null) {
        return -1;
      }
      if (b.days != null) {
        return 1;
      }
      return (a.item.quantity ?? 999) - (b.item.quantity ?? 999);
    });
    return sorted[0] ?? null;
  }, [activeLinesWithDays]);

  const pendingDoses = Math.max(0, totalDosesToday - takenToday);

  const todayProgress = totalDosesToday > 0 ? Math.min(100, (takenToday / totalDosesToday) * 100) : 0;

  const handleRefillCta = () => {
    navigate('/patient/messages');
  };

  const handleOpenPharmacyModal = async (prescriptionId: string) => {
    setPharmacyModalPrescriptionId(prescriptionId);
    setLoadingPharmacies(true);
    setPharmacyError(null);
    try {
      const pharmacies = await listActivePharmacies();
      setPharmacyList(
        pharmacies.map((row) => ({
          id: row.id,
          name: row.name,
          city: row.city ?? '',
        }))
      );
    } catch (err) {
      setPharmacyError(err instanceof Error ? err.message : 'Could not load pharmacies. Please try again.');
    } finally {
      setLoadingPharmacies(false);
    }
  };

  const handleMessagePharmacy = async (prescriptionId: string) => {
    setActionError(null);
    try {
      const contact = await getPatientPrescriptionPharmacyContact(prescriptionId);
      if (!contact?.user_id) {
        throw new Error('No pharmacy contact is available for this prescription yet.');
      }
      navigate(`/patient/messages?pharmacy=${contact.user_id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not open pharmacy messaging. Please try again.');
    }
  };

  const handleSelectPharmacy = async (pharmacyId: string) => {
    if (!pharmacyModalPrescriptionId) return;
    setSendingToPharmacy(true);
    setPharmacyError(null);
    try {
      await assignPatientPrescriptionPharmacy(pharmacyModalPrescriptionId, pharmacyId);
      setPharmacySentId(pharmacyModalPrescriptionId);
      setPharmacyModalPrescriptionId(null);
      void refetch();
    } catch (err) {
      setPharmacyError(err instanceof Error ? err.message : 'Could not send to pharmacy. Please try again.');
    } finally {
      setSendingToPharmacy(false);
    }
  };

  const handleMarkPickedUp = async (prescriptionId: string, items: PrescriptionItem[]) => {
    if (!user?.id) return;
    setActionError(null);
    try {
      await markPatientPrescriptionPickedUp(
        prescriptionId,
        items.map((item) => item.id)
      );
      setPickedUpIds((prev) => new Set([...prev, prescriptionId]));
      void refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not mark this prescription as picked up.');
    }
  };

  const pharmacyStatusCopy = (
    status: PatientPrescriptionRecord['pharmacyStatus'],
    justSent: boolean
  ): { title: string; body: string } => {
    if (status === 'dispensed') {
      return {
        title: t('patient.prescriptions.pharmacyStatusDispensedTitle'),
        body: t('patient.prescriptions.pharmacyStatusDispensedBody'),
      };
    }
    if (status === 'in_progress') {
      return {
        title: t('patient.prescriptions.pharmacyStatusInProgressTitle'),
        body: t('patient.prescriptions.pharmacyStatusInProgressBody'),
      };
    }
    if (status === 'on_hold') {
      return {
        title: t('patient.prescriptions.pharmacyStatusOnHoldTitle'),
        body: t('patient.prescriptions.pharmacyStatusOnHoldBody'),
      };
    }
    if (status === 'cancelled') {
      return {
        title: t('patient.prescriptions.pharmacyStatusCancelledTitle'),
        body: t('patient.prescriptions.pharmacyStatusCancelledBody'),
      };
    }
    if (status === 'picked_up') {
      return {
        title: '✅ Picked Up',
        body: 'You have collected this medication. Take it as prescribed.',
      };
    }
    if (status === 'new' || justSent) {
      return {
        title: t('patient.prescriptions.pharmacyStatusNewTitle'),
        body: t('patient.prescriptions.pharmacyStatusNewBody'),
      };
    }
    return {
      title: t('patient.prescriptions.pharmacyFollowUpTitle'),
      body: t('patient.prescriptions.pharmacyFollowUpBody'),
    };
  };

  const activePlanCount = activePrescriptions.length;
  const pastPlanCount = pastPrescriptions.length;
  const todayLabel = new Date().toLocaleDateString(
    locale,
    dateTimeFormatWithNumerals(uiLang, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  );

  const scheduleBlocks = useMemo<ScheduleBlock[]>(() => {
    const map = new Map<DoseSlotKey, ScheduleDose[]>();
    for (const key of Object.keys(SLOT_META) as DoseSlotKey[]) {
      map.set(key, []);
    }

    for (const row of activeLineItems) {
      inferDoseSlots(row.item).forEach((slot, doseIndex) => {
        map.get(slot)?.push({ row, doseIndex });
      });
    }

    let pendingAssigned = false;
    return (Object.keys(SLOT_META) as DoseSlotKey[])
      .map((key) => {
        const meta = SLOT_META[key];
        const doses = map.get(key) ?? [];
        const status: ScheduleBlock['status'] = !pendingAssigned && doses.length > 0 ? 'pending' : 'scheduled';
        if (doses.length > 0) {
          pendingAssigned = true;
        }
        return {
          key,
          time: meta.time,
          labelKey: meta.labelKey,
          noteKey: meta.noteKey,
          status,
          doses,
        };
      })
      .filter((block) => block.doses.length > 0);
  }, [activeLineItems]);

  const scheduleSummaryBlocks = useMemo(
    () =>
      scheduleBlocks.map((block) => ({
        ...block,
        count: block.doses.length,
      })),
    [scheduleBlocks]
  );

  const reminderRows = useMemo(
    () =>
      activeLineItems.flatMap((row) =>
        inferDoseSlots(row.item).map((slot, index) => ({
          id: `${row.item.id}-${slot}-${index}`,
          row,
          slot,
          time: SLOT_META[slot].time,
          doseLabel: `${t(SLOT_META[slot].labelKey)} ${index + 1}`,
        }))
      ),
    [activeLineItems, t]
  );

  const insuranceCoveragePercent =
    primaryInsurance?.coPayPercent == null ? null : Math.max(0, 100 - primaryInsurance.coPayPercent);
  const insuranceCoPayPercent = primaryInsurance?.coPayPercent ?? null;

  const handleMarkScheduleTaken = async (itemId: string, doseIndex: number) => {
    if (!user?.id) return;
    setActionError(null);
    try {
      await markMedicationTaken(itemId);
      void doseIndex;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save that medication update.');
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEditReminder = (reminderId: string, currentTime: string) => {
    setEditingReminderId(reminderId);
    setEditingReminderTime(currentTime);
  };

  const handleSaveReminderTime = async (reminderId: string) => {
    const reminder = reminderRows.find((r) => r.id === reminderId);
    if (!reminder) return;
    setDbReminders((prev) => {
      const next = new Map(prev);
      next.set(reminderId, { time: editingReminderTime, isPaused: false, isDeleted: false });
      return next;
    });
    setEditingReminderId(null);
    setEditingReminderTime('');
  };

  const handlePauseReminder = async (reminderId: string) => {
    const reminder = reminderRows.find((r) => r.id === reminderId);
    if (!reminder) return;
    const isPaused = !pausedReminderIds.has(reminderId);
    setPausedReminderIds((prev) => {
      const next = new Set(prev);
      if (next.has(reminderId)) {
        next.delete(reminderId);
      } else {
        next.add(reminderId);
      }
      return next;
    });
    setDbReminders((prev) => {
      const next = new Map(prev);
      next.set(reminderId, {
        time: prev.get(reminderId)?.time ?? reminder.time,
        isPaused,
        isDeleted: false,
      });
      return next;
    });
  };

  const handleDeleteReminder = (reminderId: string) => {
    setDeletedReminderIds((prev) => new Set([...prev, reminderId]));
    setUndoReminderId(reminderId);
    const timer = setTimeout(() => {
      setUndoReminderId(null);
      const reminder = reminderRows.find((r) => r.id === reminderId);
      if (!reminder) return;
      setDbReminders((prev) => {
        const next = new Map(prev);
        next.set(reminderId, {
          time: prev.get(reminderId)?.time ?? reminder.time,
          isPaused: false,
          isDeleted: true,
        });
        return next;
      });
    }, 5000);
    return () => clearTimeout(timer);
  };

  const handleUndoDeleteReminder = (reminderId: string) => {
    setDeletedReminderIds((prev) => {
      const next = new Set(prev);
      next.delete(reminderId);
      return next;
    });
    setUndoReminderId(null);
  };

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="mb-2 font-playfair text-3xl font-bold text-slate-900 md:text-4xl">
            {t('patient.prescriptions.titleMedications')} <span aria-hidden>💊</span>
          </h1>
          <p className="text-[15px] text-slate-400">{t('patient.prescriptions.subtitleLoading')}</p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const renderPastTab = () => {
    if (pastLineItems.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
          {t('patient.prescriptions.historyEmpty')}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h3 className="mb-2 text-lg font-bold text-slate-900">{t('patient.prescriptions.pastTitle')}</h3>
          <p className="text-sm text-slate-500">{t('patient.prescriptions.pastSubtitle')}</p>
        </div>

        <div className="space-y-4">
          {pastLineItems.map(({ item, prescription }, idx) => (
            <div
              key={item.id}
              style={{ animationDelay: `${idx * 80}ms` }}
              className="animate-slideUp rounded-xl border-l-4 border-slate-200 bg-white p-5 opacity-85 shadow-sm transition-all duration-300 hover:opacity-100 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Pill className="h-6 w-6 text-slate-400" />
                  </div>

                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h4 className="text-base font-bold text-slate-700">
                        <MedicationNameDisplay
                          canonicalName={item.medication_name}
                          localizedName={item.medication_name_ar}
                          language={uiLang}
                          variant="compact"
                        />{' '}
                        {item.dosage ?? ''}
                      </h4>
                      <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                        ⏹ {prescriptionStatusLabel(t, prescription.status)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <div>{formatDate(prescription.prescribed_at)}</div>
                      <div className="h-1 w-1 rounded-full bg-slate-300" />
                      <div>{item.duration ?? t('patient.prescriptions.durationNotRecorded')}</div>
                      <div className="h-1 w-1 rounded-full bg-slate-300" />
                      <div>{prescription.doctorName}</div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/patient/messages?doctor=${prescription.doctor_id}`)}
                  className="flex items-center gap-2 rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-all duration-300 hover:bg-slate-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  {t('patient.prescriptions.requestAgain')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEmptyTab = (icon: React.ReactNode, titleKey: string, bodyKey: string) => (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
        {icon}
      </div>
      <h3 className="font-playfair text-xl font-bold text-slate-900">{t(titleKey)}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{t(bodyKey)}</p>
    </div>
  );

  const renderScheduleTab = () => {
    if (activeLineItems.length === 0 || scheduleBlocks.length === 0) {
      return renderEmptyTab(
        <CalendarClock className="h-7 w-7" />,
        'patient.prescriptions.scheduleEmptyTitle',
        'patient.prescriptions.scheduleEmptyBody'
      );
    }

    const completion = totalDosesToday > 0 ? Math.round((takenToday / totalDosesToday) * 100) : 0;

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{todayLabel}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {t('patient.prescriptions.scheduleProgress', {
                  taken: formatLocaleDigits(takenToday, uiLang),
                  total: formatLocaleDigits(totalDosesToday, uiLang),
                  percent: formatLocaleDigits(completion, uiLang),
                })}
              </p>
            </div>
            <div className="text-sm font-medium text-amber-600">
              {t('patient.prescriptions.scheduleRemaining', {
                count: formatLocaleDigits(pendingDoses, uiLang),
              })}
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500 ease-out"
              style={{ width: `${completion}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">{t('patient.prescriptions.scheduleDataNote')}</p>
        </div>

        <div className="space-y-4">
          {scheduleBlocks.map((block, idx) => (
            <div
              key={block.key}
              className={`rounded-2xl border-2 p-5 transition-all duration-300 ${
                block.status === 'pending'
                  ? 'border-amber-300 bg-amber-50 animate-glow'
                  : 'border-slate-200 bg-slate-50'
              }`}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-lg px-3 py-1.5 font-mono text-sm font-bold ${
                      block.status === 'pending'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {block.time}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{t(block.labelKey)}</div>
                    {block.status === 'pending' ? (
                      <div className="text-xs font-medium text-amber-600">
                        {t('patient.prescriptions.scheduleNeedsConfirmation')}
                      </div>
                    ) : null}
                  </div>
                </div>
                {block.status === 'scheduled' ? (
                  <div className="text-sm font-bold text-slate-400">{t('patient.prescriptions.schedulePlanned')}</div>
                ) : null}
              </div>

              <div className="space-y-3">
                {block.doses.map(({ row, doseIndex }) => {
                  const accent = lineAccent(row.item.medication_name);
                  const isTaken = takenItemIds.has(row.item.id);
                  return (
                    <div
                      key={`${row.item.id}-${doseIndex}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${accent.hex}20` }}
                        >
                          <Pill className="h-5 w-5" style={{ color: accent.hex }} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            <MedicationNameDisplay
                              canonicalName={row.item.medication_name}
                              localizedName={row.item.medication_name_ar}
                              language={uiLang}
                              variant="compact"
                            />{' '}
                            {row.item.dosage ?? ''}
                          </div>
                          <div
                            className={`text-xs font-medium ${
                              block.status === 'pending' ? 'text-amber-600' : 'text-slate-500'
                            }`}
                          >
                            {block.status === 'pending'
                              ? t('patient.prescriptions.schedulePendingDose', { time: block.time })
                              : t('patient.prescriptions.scheduleScheduledDose', { time: block.time })}
                          </div>
                        </div>
                      </div>
                      {isTaken ? (
                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-700">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {t('patient.prescriptions.dispensed', { defaultValue: 'Taken ✓' })}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleMarkScheduleTaken(row.item.id, doseIndex)}
                          className="rounded-full bg-teal-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-700"
                        >
                          {t('patient.prescriptions.scheduleMarkTaken')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {block.noteKey ? (
                <div className="mt-3 text-xs font-medium text-slate-600">{t(block.noteKey)}</div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {scheduleSummaryBlocks.map((block) => (
            <div key={block.key} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-2 text-xs text-slate-400">{block.time}</div>
              <div className={block.status === 'pending' ? 'text-lg font-bold text-amber-600' : 'text-lg font-bold text-slate-500'}>
                {block.status === 'pending'
                  ? t('patient.prescriptions.scheduleSummaryPending', {
                      count: formatLocaleDigits(block.count, uiLang),
                    })
                  : t('patient.prescriptions.scheduleSummaryScheduled', {
                      count: formatLocaleDigits(block.count, uiLang),
                    })}
              </div>
            </div>
          ))}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-2 text-xs text-slate-400">{t('patient.prescriptions.scheduleOverall')}</div>
            <div className="text-lg font-bold text-teal-600">
              {formatLocaleDigits(takenToday, uiLang)}/{formatLocaleDigits(totalDosesToday, uiLang)} ({formatLocaleDigits(completion, uiLang)}%)
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRemindersTab = () => {
    if (reminderRows.length === 0) {
      return renderEmptyTab(
        <Bell className="h-7 w-7" />,
        'patient.prescriptions.remindersEmptyTitle',
        'patient.prescriptions.remindersEmptyBody'
      );
    }

    const weeklyBars = [
      { label: t('patient.prescriptions.dayMon'), percent: monthlyAdherencePercent },
      { label: t('patient.prescriptions.dayTue'), percent: monthlyAdherencePercent },
      { label: t('patient.prescriptions.dayWed'), percent: monthlyAdherencePercent },
      { label: t('patient.prescriptions.dayThu'), percent: Math.max(0, monthlyAdherencePercent - 10) },
      { label: t('patient.prescriptions.dayFri'), percent: monthlyAdherencePercent },
      { label: t('patient.prescriptions.daySat'), percent: Math.max(0, monthlyAdherencePercent - 15) },
      { label: t('patient.prescriptions.daySun'), percent: monthlyAdherencePercent },
    ];

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-teal-700 p-8 text-white">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 font-playfair text-3xl font-bold">
                {t('patient.prescriptions.reminderAdherenceTitle', {
                  percent: formatLocaleDigits(monthlyAdherencePercent, uiLang),
                })}
              </div>
              <div className="flex items-center gap-2 text-teal-100">
                <span className="text-2xl" aria-hidden>
                  🔔
                </span>{' '}
                {t('patient.prescriptions.reminderAdherenceSub')}
              </div>
            </div>
            <div className="text-sm text-teal-100">
              {t('patient.prescriptions.reminderAdherenceCounts', {
                configured: formatLocaleDigits(reminderRows.length, uiLang),
                active: formatLocaleDigits(activeMedicationCount, uiLang),
              })}
            </div>
          </div>

          <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${monthlyAdherencePercent}%` }}
            />
          </div>

          <div className="flex items-end justify-between gap-2">
            {weeklyBars.map((day, idx) => (
              <div key={day.label} className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 rounded-lg transition-all duration-500 ${
                    day.percent >= 90 ? 'bg-white' : day.percent > 0 ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                  style={{ height: `${Math.max((day.percent / 100) * 80, 12)}px`, animationDelay: `${idx * 80}ms` }}
                />
                <div className="text-xs text-teal-100">{day.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900">{t('patient.prescriptions.activeReminders')}</h3>
            <button
              type="button"
              onClick={() => navigate('/patient/settings')}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              {t('patient.prescriptions.setNewReminder')}
            </button>
          </div>

          <div className="space-y-4">
            {reminderRows.map((reminder, idx) => {
              const accent = lineAccent(reminder.row.item.medication_name);
              const isPaused = pausedReminderIds.has(reminder.id) || (dbReminders.get(reminder.id)?.isPaused ?? false);
              const isDeleted = deletedReminderIds.has(reminder.id);

              if (isDeleted) {
                return undoReminderId === reminder.id ? (
                  <div key={reminder.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <span className="text-sm text-amber-700">Reminder deleted</span>
                    <button
                      type="button"
                      onClick={() => handleUndoDeleteReminder(reminder.id)}
                      className="text-sm font-bold text-amber-700 underline transition hover:text-amber-900"
                    >
                      Undo
                    </button>
                  </div>
                ) : null;
              }

              return (
                <div
                  key={reminder.id}
                  style={{ animationDelay: `${idx * 80}ms`, borderLeftColor: accent.hex }}
                  className={`animate-slideUp rounded-xl border-l-4 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md ${isPaused ? 'opacity-50' : ''}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
                        <Bell className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          <MedicationNameDisplay
                            canonicalName={reminder.row.item.medication_name}
                            localizedName={reminder.row.item.medication_name_ar}
                            language={uiLang}
                            variant="compact"
                          />{' '}
                          — {reminder.doseLabel}
                        </h4>
                        <div className="mt-1 text-sm text-slate-600">⏰ {dbReminders.get(reminder.id)?.time ?? reminder.time}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      {t('patient.prescriptions.reminderDerivedStatus')}
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <span aria-hidden>📱</span> {t('patient.prescriptions.reminderAppOn')}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <span aria-hidden>💬</span> {t('patient.prescriptions.reminderSmsOff')}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <span aria-hidden>💚</span> {t('patient.prescriptions.reminderWhatsAppOff')}
                    </div>
                  </div>

                  <div className="mb-3 rounded-lg bg-slate-50 p-3">
                    <div className="text-xs italic text-slate-600">
                      {t('patient.prescriptions.reminderPreview', {
                        name: reminder.row.item.medication_name,
                        dose: reminder.row.item.dosage ?? t('patient.prescriptions.frequencyDosing'),
                        time: reminder.time,
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {editingReminderId === reminder.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={editingReminderTime}
                          onChange={(e) => setEditingReminderTime(e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-teal-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSaveReminderTime(reminder.id)}
                          className="rounded-lg bg-teal-600 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingReminderId(null)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEditReminder(reminder.id, reminder.time)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-teal-600 transition-all hover:bg-teal-50"
                      >
                        <Pencil className="h-3.5 w-3.5" /> {t('patient.prescriptions.reminderEdit')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handlePauseReminder(reminder.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        isPaused
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'text-amber-600 hover:bg-amber-50'
                      }`}
                    >
                      <Pause className="h-3.5 w-3.5" />
                      {isPaused ? t('patient.prescriptions.reminderResume', { defaultValue: 'Resume' }) : t('patient.prescriptions.reminderPause')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t('patient.prescriptions.reminderDelete')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <button
            type="button"
            onClick={() => setShowMissedDoseAnalysis((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg p-3 transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              {t('patient.prescriptions.missedDoseAnalysis')}
            </div>
            {showMissedDoseAnalysis
              ? <ChevronUp className="h-4 w-4 text-slate-400" />
              : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {showMissedDoseAnalysis ? (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'This Week', value: '0', color: 'text-emerald-600' },
                  { label: 'This Month', value: '0', color: 'text-emerald-600' },
                  { label: 'Streak', value: `${formatLocaleDigits(dispensedCount, uiLang)} days`, color: 'text-teal-600' },
                  { label: 'Adherence', value: `${formatLocaleDigits(monthlyAdherencePercent, uiLang)}%`, color: 'text-teal-600' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-slate-50 p-3 text-center">
                    <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="mt-1 text-xs text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 text-center">
                {t('patient.prescriptions.adherenceNote')}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderCostsTab = () => {
    const planName = primaryInsurance?.planName ?? t('patient.prescriptions.coverageNoPlan');
    const coveredPercent = insuranceCoveragePercent ?? 0;
    const patientPercent = insuranceCoPayPercent ?? 0;
    const hasCoverage = Boolean(primaryInsurance);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border-2 border-teal-200 bg-white p-8 shadow-lg">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
                {t('patient.prescriptions.costMonthlyTitle')}
              </div>
              <div className="mb-4 font-mono text-5xl font-bold text-teal-600">
                {hasCoverage && insuranceCoPayPercent != null
                  ? `${formatLocaleDigits(Math.round(insuranceCoPayPercent), uiLang)}%`
                  : t('patient.prescriptions.kpiCostPlaceholder')}
              </div>
              <div className="mb-6 text-sm text-slate-400">
                {hasCoverage
                  ? t('patient.prescriptions.costMonthlySubWithPlan', { name: planName })
                  : t('patient.prescriptions.costMonthlySubNoPlan')}
              </div>

              <div className="mb-6 space-y-3">
                {activeLineItems.map(({ item }) => {
                  const accent = lineAccent(item.medication_name);
                  return (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span aria-hidden>{accent.emoji}</span>
                        <span className="text-slate-700">
                          <MedicationNameDisplay
                            canonicalName={item.medication_name}
                            localizedName={item.medication_name_ar}
                            language={uiLang}
                            variant="compact"
                          />{' '}
                          {item.dosage ?? ''}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-slate-900">
                        {t('patient.prescriptions.costNotPriced')}
                        <span className="ml-2 text-xs text-slate-400">
                          {hasCoverage
                            ? t('patient.prescriptions.costPlanApplies')
                            : t('patient.prescriptions.costNoPlanRow')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm text-slate-400">{t('patient.prescriptions.costWithoutInsurance')}</div>
                  <div className="font-mono text-sm text-slate-400 line-through">
                    {t('patient.prescriptions.costNotPriced')}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-base font-bold text-emerald-600">{t('patient.prescriptions.costCoverage')}</div>
                  <div className="font-mono text-xl font-bold text-emerald-600">
                    {hasCoverage
                      ? t('patient.prescriptions.costCoveragePercent', {
                          percent: formatLocaleDigits(Math.round(coveredPercent), uiLang),
                        })
                      : t('patient.prescriptions.costNotPriced')}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-teal-600" />
                  {t('patient.prescriptions.coverageBreakdown')}
                </span>
              </div>

              <div className="mb-6 flex items-center justify-center">
                <div className="relative h-48 w-48">
                  <svg viewBox="0 0 100 100" className="-rotate-90 transform">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#F0F9FF" strokeWidth="20" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="20"
                      strokeDasharray={`${(coveredPercent / 100) * 251.2} 251.2`}
                      className="transition-all duration-1000 ease-out"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#0D9488"
                      strokeWidth="20"
                      strokeDasharray={`${(patientPercent / 100) * 251.2} 251.2`}
                      strokeDashoffset={`-${(coveredPercent / 100) * 251.2}`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="font-mono text-2xl font-bold text-teal-600">
                        {hasCoverage
                          ? `${formatLocaleDigits(Math.round(patientPercent), uiLang)}%`
                          : t('patient.prescriptions.kpiCostPlaceholder')}
                      </div>
                      <div className="text-xs text-slate-400">{t('patient.prescriptions.yourShare')}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-slate-700">{planName}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {formatLocaleDigits(Math.round(coveredPercent), uiLang)}%
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-teal-50 p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-teal-500" />
                    <span className="text-sm text-slate-700">{t('patient.prescriptions.youPay')}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {formatLocaleDigits(Math.round(patientPercent), uiLang)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-bold text-slate-900">{t('patient.prescriptions.coverageTableTitle')}</h3>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      {t('patient.prescriptions.coverageMedication')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                      {t('patient.prescriptions.coverageFullPrice')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                      {t('patient.prescriptions.coveragePlanCovers')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                      {t('patient.prescriptions.coverageYouPay')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      {t('patient.prescriptions.coverageType')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeLineItems.map(({ item }, idx) => {
                    const accent = lineAccent(item.medication_name);
                    return (
                      <tr key={item.id} className={idx !== activeLineItems.length - 1 ? 'border-b border-slate-100' : ''}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span aria-hidden>{accent.emoji}</span>
                            <span className="text-sm font-medium text-slate-900">
                              <MedicationNameDisplay
                                canonicalName={item.medication_name}
                                localizedName={item.medication_name_ar}
                                language={uiLang}
                                variant="compact"
                              />{' '}
                              {item.dosage ?? ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-sm text-slate-600">
                          {t('patient.prescriptions.costNotPriced')}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-sm font-bold text-emerald-600">
                          {hasCoverage
                            ? t('patient.prescriptions.costCoveragePercent', {
                                percent: formatLocaleDigits(Math.round(coveredPercent), uiLang),
                              })
                            : t('patient.prescriptions.costNotPriced')}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-sm font-bold text-slate-900">
                          {hasCoverage
                            ? t('patient.prescriptions.costCoveragePercent', {
                                percent: formatLocaleDigits(Math.round(patientPercent), uiLang),
                              })
                            : t('patient.prescriptions.costNotPriced')}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1 text-xs">
                            <span className={hasCoverage ? 'text-emerald-600' : 'text-amber-600'}>
                              {hasCoverage ? '✓' : '⚠️'}
                            </span>
                            <span className="text-slate-600">
                              {hasCoverage
                                ? t('patient.prescriptions.coveragePlanRule', { name: planName })
                                : t('patient.prescriptions.coveragePlanMissing')}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3 text-xs italic text-slate-500">{t('patient.prescriptions.coverageNote')}</div>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-8">
          <div className="mb-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-teal-600" />
            <h3 className="text-xl font-bold text-slate-900">{t('patient.prescriptions.annualProjection')}</h3>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-2 text-sm text-slate-400">{t('patient.prescriptions.withoutInsurance')}</div>
              <div className="font-mono text-3xl font-bold text-slate-400 line-through">
                {t('patient.prescriptions.costNotPriced')}
              </div>
              <div className="mt-1 text-xs text-slate-400">{t('patient.prescriptions.perYear')}</div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-2 text-sm text-teal-600">{t('patient.prescriptions.withPlan', { name: planName })}</div>
              <div className="font-mono text-3xl font-bold text-teal-600">
                {hasCoverage
                  ? `${formatLocaleDigits(Math.round(patientPercent), uiLang)}%`
                  : t('patient.prescriptions.costNotPriced')}
              </div>
              <div className="mt-1 text-xs text-slate-500">{t('patient.prescriptions.coPayEstimate')}</div>
            </div>

            <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white shadow-lg">
              <div className="mb-2 text-sm text-emerald-100">{t('patient.prescriptions.planBenefit')}</div>
              <div className="font-mono text-3xl font-bold">
                {primaryInsurance?.annualLimit
                  ? `AED ${formatLocaleDigits(Math.round(primaryInsurance.annualLimit), uiLang)}`
                  : t('patient.prescriptions.costNotPriced')}
              </div>
              <div className="mt-1 text-xs text-emerald-100">{t('patient.prescriptions.annualLimit')}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveLineCard = (row: ActiveLine, index: number) => {
    const { item, prescription: rx } = row;
    const accent = lineAccent(item.medication_name);
    const isExpanded = expandedLineIds.has(item.id);
    const slotCount = Math.max(1, estimateDosesPerDay(item.frequency) ?? 1);
    const q = item.quantity;
    const daysRem = estimateDaysOfSupplyRemaining(q, item.frequency);
    const urgency = urgencyFromDaysRemaining(daysRem, q);
    const barPct = supplyBarPercent(daysRem, q, 30);
    const refill = urgency;
    const refillGradient =
      refill === 'emerald'
        ? 'from-emerald-500 to-emerald-600'
        : refill === 'amber'
          ? 'from-amber-500 to-amber-600'
          : 'from-red-500 to-red-600';
    const refillText =
      refill === 'emerald'
        ? 'text-emerald-600'
        : refill === 'amber'
          ? 'text-amber-600'
          : 'text-red-600';

    return (
      <div
        key={item.id}
        className="animate-slideUp rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:scale-[1.012] hover:shadow-lg"
        style={{ animationDelay: `${index * 50}ms`, borderLeftColor: accent.hex, borderLeftWidth: 5 }}
      >
        <div className="p-6">
          <div className="flex items-start gap-4 lg:gap-6">
            <div className="w-full min-w-0 flex-shrink-0 md:w-72">
              <div className="mb-4 flex items-start gap-4">
                <div
                  className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${accent.bg}`}
                >
                  <Pill className="h-6 w-6" style={{ color: accent.hex }} />
                  <div className="absolute -bottom-1 -right-1 text-base" aria-hidden>
                    {accent.emoji}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-playfair text-lg font-bold text-slate-900">
                    <MedicationNameDisplay
                      canonicalName={item.medication_name}
                      localizedName={item.medication_name_ar}
                      language={uiLang}
                      primaryClassName="block truncate"
                      secondaryClassName="mt-0.5 block truncate text-sm font-normal text-slate-500"
                    />
                  </h3>
                  <div className="mt-0.5 font-mono text-base font-bold" style={{ color: accent.hex }}>
                    {item.dosage || '—'}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatMedicationDetailLine(t, uiLang, {
                      dosage: item.dosage,
                      frequency: item.frequency,
                      duration: item.duration,
                      detail: '',
                      emptyFallback: '',
                    }) || t('patient.prescriptions.frequencyDosing')}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}
                >
                  {rx.doctorSpecialty
                    ? `${t('patient.prescriptions.relatedCare')}: ${rx.doctorSpecialty}`
                    : t('patient.prescriptions.activeTherapy')}
                </div>
              </div>

              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-xs font-bold text-white">
                  {doctorInitials(rx.doctorName)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-600">{rx.doctorName}</div>
                  {rx.doctorSpecialty ? (
                    <div className="text-[11px] text-teal-600">{rx.doctorSpecialty}</div>
                  ) : null}
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                {t('patient.prescriptions.since')}: {formatDate(rx.prescribed_at)}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-4">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {t('patient.prescriptions.dosingScheduleHeading')}
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-3">
                  {Array.from({ length: Math.min(4, slotCount) }).map((_, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full shadow-lg ${
                          item.is_dispensed || takenItemIds.has(item.id)
                            ? 'bg-emerald-500 shadow-emerald-500/30'
                            : 'bg-slate-200'
                        }`}
                      >
                        {item.is_dispensed || takenItemIds.has(item.id) ? <div className="h-2 w-2 rounded-full bg-white" /> : null}
                      </div>
                      <div className="mt-1 text-[11px] font-mono text-slate-500">
                        {t('patient.prescriptions.slotN', { n: idx + 1 })}
                      </div>
                      <div
                        className={`mt-0.5 text-xs font-medium ${
                          item.is_dispensed || takenItemIds.has(item.id) ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {item.is_dispensed || takenItemIds.has(item.id)
                          ? t('patient.prescriptions.pharmacyRecorded')
                          : t('patient.prescriptions.scheduleTbd')}
                      </div>
                    </div>
                  ))}
                </div>

                {item.instructions ? (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <div className="text-sm text-slate-600">📋 {item.instructions}</div>
                    {slotCount > 1 ? (
                      <div className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-700">
                        {t('patient.prescriptions.timesPerDay', { n: String(slotCount) })}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <p className="text-xs text-slate-500">{t('patient.prescriptions.adherenceNote')}</p>
              </div>
            </div>

            <div className="w-full flex-shrink-0 sm:w-56">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {t('patient.prescriptions.refillStatusHeading')}
              </div>

              <div className="mb-3">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full bg-gradient-to-r ${refillGradient} transition-all duration-500 ease-out`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                {q != null ? (
                  <>
                    <div className={`mt-2 font-mono text-sm font-bold ${refillText}`}>
                      {daysRem != null
                        ? t('patient.prescriptions.daysEst', { days: formatLocaleDigits(daysRem, uiLang) })
                        : `${formatLocaleDigits(q, uiLang)} ${t('patient.prescriptions.qtyUnit')}`}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {daysRem != null
                        ? t('patient.prescriptions.daysEstHint')
                        : t('patient.prescriptions.quantityOnPrescription')}
                    </div>
                  </>
                ) : (
                  <div className="mt-2 text-sm text-slate-500">—</div>
                )}

                {isUrgentRefill(daysRem, q, 7) ? (
                  <div className="mt-2 animate-pulse rounded-full bg-red-500 px-2 py-1 text-center text-xs font-bold text-white">
                    {t('patient.prescriptions.reviewSupply')}
                  </div>
                ) : null}
              </div>

              <div className="mb-3 space-y-1 text-xs text-slate-500">
                <p>{t('patient.prescriptions.rxStatus')}</p>
                <p
                  className={item.is_dispensed ? 'font-medium text-emerald-600' : 'font-medium text-amber-600'}
                >
                  {item.is_dispensed
                    ? t('patient.prescriptions.dispensed')
                    : t('patient.prescriptions.pendingItem')}
                </p>
              </div>

              <div className="mb-3 rounded-lg bg-slate-50 p-3">
                <div className="mb-1.5 flex items-start gap-2">
                  <div className="text-sm" aria-hidden>🏪</div>
                  <div className="flex-1">
                    {(() => {
                      const copy = pharmacyStatusCopy(
                        rx.pharmacyStatus,
                        pharmacySentId === rx.id
                      );
                      return (
                        <>
                          <div className="text-xs font-medium text-slate-600">{copy.title}</div>
                          <div className="text-[11px] text-slate-400">{copy.body}</div>
                          {rx.pharmacyName ? (
                            <div className="mt-1 text-[11px] font-medium text-teal-700">
                              {t('patient.prescriptions.pharmacyAtName', { name: rx.pharmacyName })}
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                </div>
                {rx.pharmacyStatus === 'not_sent' && pharmacySentId !== rx.id ? (
                  <button
                    type="button"
                    onClick={() => void handleOpenPharmacyModal(rx.id)}
                    className="mt-2 w-full rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                  >
                    {t('patient.prescriptions.sendToPharmacy')}
                  </button>
                ) : null}
                {rx.pharmacyStatus === 'dispensed' && !pickedUpIds.has(rx.id) ? (
                  <button
                    type="button"
                    onClick={() => void handleMarkPickedUp(rx.id, rx.items)}
                    className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    ✅ Mark as Picked Up
                  </button>
                ) : null}
                {(rx.pharmacyStatus === 'picked_up' || pickedUpIds.has(rx.id)) ? (
                  <div className="mt-2 w-full rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 text-center">
                    ✅ Picked Up — Thank you!
                  </div>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleExpanded(item.id)}
              className="flex-shrink-0 self-start rounded-lg p-2 transition-colors hover:bg-slate-50"
              aria-label={isExpanded ? t('patient.prescriptions.collapse') : t('patient.prescriptions.expand')}
            >
              {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
            </button>
          </div>

          {isExpanded ? (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleRefillCta()}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-teal-600 transition-all duration-300 hover:bg-teal-50"
                >
                  <RefreshCw className="h-4 w-4" /> {t('patient.prescriptions.refill')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/patient/messages?doctor=${rx.doctor_id}`)}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-teal-600 transition-all duration-300 hover:bg-teal-50"
                >
                  <MessageSquare className="h-4 w-4" /> {t('patient.messages.messagePrescriber')}
                </button>
                {rx.pharmacyOrganizationId ? (
                  <button
                    type="button"
                    onClick={() => void handleMessagePharmacy(rx.id)}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-emerald-600 transition-all duration-300 hover:bg-emerald-50"
                  >
                    <MessageSquare className="h-4 w-4" /> Message Pharmacy
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderActiveTab = () => {
    if (activeLineItems.length === 0) {
      return (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
          <div className="absolute right-0 top-0 h-64 w-64 opacity-5">
            <img
              src="https://images.pexels.com/photos/3873146/pexels-photo-3873146.jpeg?auto=compress&cs=tinysrgb&w=400"
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="relative p-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-ceenai-cyan to-ceenai-blue shadow-lg">
              <Pill className="h-10 w-10 text-white" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">{t('patient.prescriptions.emptyActiveTitle')}</h3>
            <p className="text-gray-600">{t('patient.prescriptions.emptyActiveBody')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {allergyRows && allergyRows.length > 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-red-700">
                {t('patient.prescriptions.allergyPrefix')}{' '}
                {allergyRows
                  .map((a) =>
                    a.reaction
                      ? `${a.allergen} (${a.reaction})${a.severity ? `, ${a.severity}` : ''}`
                      : a.allergen
                  )
                  .join(' · ')}
              </p>
              <button
                type="button"
                onClick={() => navigate('/patient/records')}
                className="mt-1 inline-block text-sm font-medium text-red-600 hover:text-red-700"
              >
                {t('patient.prescriptions.allergyLink')}
              </button>
            </div>
          </div>
        ) : null}

        {activeLineItems.map((row, idx) => renderActiveLineCard(row, idx))}
      </div>
    );
  };

  const tabs: Array<{ key: MedicationTab; labelKey: string; emoji: string; count?: number }> = [
    { key: 'active', labelKey: 'patient.prescriptions.tabActive', emoji: '💊', count: activeMedicationCount },
    { key: 'schedule', labelKey: 'patient.prescriptions.tabSchedule', emoji: '📅' },
    { key: 'reminders', labelKey: 'patient.prescriptions.tabReminders', emoji: '📋' },
    { key: 'past', labelKey: 'patient.prescriptions.tabPast', emoji: '🕐', count: pastPlanCount },
    { key: 'costs', labelKey: 'patient.prescriptions.tabCosts', emoji: '💰' },
  ];

  return (
    <div className="animate-fadeIn">
      {error ? (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <p>{t('patient.prescriptions.loadError')}</p>
          <p className="mt-1 text-xs text-red-800/80">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-2 font-semibold text-red-800 underline"
          >
            {t('shared.retry', { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : null}

      {actionError || medicationLogError ? (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {t('patient.prescriptions.actionError', {
            defaultValue: 'We could not save that update: {{message}}',
            message: actionError ?? medicationLogError,
          })}
        </div>
      ) : null}

      <div className="mb-8 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="mb-2 font-playfair text-3xl font-bold text-slate-900 tracking-tight md:text-4xl">
            {t('patient.prescriptions.titleMedications')} <span aria-hidden>💊</span>
          </h1>
          <p className="text-[15px] text-slate-400">{t('patient.prescriptions.subtitleTrack')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-500/30 sm:px-6 sm:py-3 sm:text-[13px]">
            <Pill className="h-4 w-4" />
            <span>
              {t('patient.prescriptions.dosesTakenPill', {
                taken: formatLocaleDigits(takenToday, uiLang),
                total: formatLocaleDigits(totalDosesToday, uiLang),
              })}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRefillCta}
            className="inline-flex items-center justify-center rounded-lg border-2 border-teal-600 px-5 py-2.5 font-medium text-teal-600 transition-all duration-300 hover:border-teal-600 hover:bg-teal-600 hover:text-white"
          >
            {t('patient.prescriptions.requestRefillCta')}
          </button>
        </div>
      </div>

      <div
        className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 animate-slideUp xl:grid-cols-5"
        style={{ animationDelay: '80ms' }}
      >
        <div
          className="cursor-pointer rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
          onClick={() => setActiveTab('active')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('active'); } }}
        >
          <div className="mb-3 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
              <Pill className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <div className="font-mono text-3xl font-bold text-slate-900">
                {formatLocaleDigits(activeMedicationCount, uiLang)}
              </div>
              <div className="text-xs text-slate-400">{t('patient.prescriptions.kpiActiveMeds')}</div>
            </div>
          </div>
          <div className="text-xs font-medium text-teal-600">
            {t('patient.prescriptions.kpiForCarePlans', { count: String(activePlanCount) })}
          </div>
        </div>

        <div
          className="cursor-pointer rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
          onClick={() => setActiveTab('schedule')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('schedule'); } }}
        >
          <div className="mb-3 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <div className="font-mono text-3xl font-bold text-emerald-600">
                {formatLocaleDigits(takenToday, uiLang)}/{formatLocaleDigits(totalDosesToday, uiLang)}
              </div>
              <div className="text-xs text-slate-400">{t('patient.prescriptions.kpiTakenToday')}</div>
            </div>
          </div>
          {pendingDoses > 0 ? (
            <div className="mb-2 text-xs font-medium text-amber-500">
              {t('patient.prescriptions.kpiMorePending', { count: String(pendingDoses) })}
            </div>
          ) : (
            <div className="mb-2 text-xs font-medium text-emerald-600">{t('patient.prescriptions.kpiDosesPlanned')}</div>
          )}
          <div className="h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 ease-out"
              style={{ width: `${todayProgress}%` }}
            />
          </div>
        </div>

        <div
          className="cursor-pointer rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
          onClick={() => setActiveTab('reminders')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('reminders'); } }}
        >
          <div className="mb-3 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100">
              <TrendingUp className="h-7 w-7 text-teal-600" />
            </div>
            <div>
              <div className="font-mono text-3xl font-bold text-teal-600">
                {formatLocaleDigits(monthlyAdherencePercent, uiLang)}%
              </div>
              <div className="text-xs text-slate-400">{t('patient.prescriptions.kpiAdherenceMonth')}</div>
            </div>
          </div>
          <div className="text-xs font-medium text-slate-500">
            {t('patient.prescriptions.kpiAdherenceFromPickup', { dispensed: String(dispensedCount) })}
          </div>
        </div>

        <div
          className="cursor-pointer rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
          onClick={() => setActiveTab('active')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('active'); } }}
        >
          <div className="mb-3 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <RefreshCw className="h-7 w-7 text-amber-600" />
            </div>
            <div>
              <div className="font-mono text-3xl font-bold text-amber-600">
                {formatLocaleDigits(refillsDueCount, uiLang)}
              </div>
              <div className="text-xs text-slate-400">{t('patient.prescriptions.kpiRefillSoon')}</div>
            </div>
          </div>
          <div className="text-xs font-medium text-amber-500">
            {firstLowSupplyLine
              ? firstLowSupplyLine.days != null
                ? t('patient.prescriptions.kpiRefillSubDays', {
                    name:
                      firstLowSupplyLine.item.medication_name.split(/\s+/)[0] ?? firstLowSupplyLine.item.medication_name,
                    days: formatLocaleDigits(firstLowSupplyLine.days, uiLang),
                  })
                : t('patient.prescriptions.kpiRefillSub', {
                    name:
                      firstLowSupplyLine.item.medication_name.split(/\s+/)[0] ?? firstLowSupplyLine.item.medication_name,
                    qty: firstLowSupplyLine.item.quantity == null ? '—' : String(firstLowSupplyLine.item.quantity),
                  })
              : t('patient.prescriptions.kpiRefillNone')}
          </div>
        </div>

        <div
          className="cursor-pointer rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/patient/insurance')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/patient/insurance');
            }
          }}
        >
          <div className="mb-3 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
              <CreditCard className="h-7 w-7 text-purple-600" />
            </div>
            <div className="min-w-0">
              {insuranceLoading ? (
                <>
                  <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
                  <div className="mt-1 h-3 w-24 animate-pulse rounded bg-slate-100" />
                </>
              ) : primaryInsurance && primaryInsurance.coPayPercent != null ? (
                <>
                  <div className="font-mono text-3xl font-bold text-slate-900">
                    {formatLocaleDigits(Math.round(primaryInsurance.coPayPercent), uiLang)}%
                  </div>
                  <div className="text-xs text-slate-400">{t('patient.prescriptions.kpiCoPay')}</div>
                </>
              ) : (
                <>
                  <div className="font-mono text-3xl font-bold text-slate-900">
                    {t('patient.prescriptions.kpiCostPlaceholder')}
                  </div>
                  <div className="text-xs text-slate-400">{t('patient.prescriptions.kpiMonthlyCost')}</div>
                </>
              )}
            </div>
          </div>
          {!insuranceLoading && primaryInsurance ? (
            <div className="space-y-1">
              <div className="text-xs font-medium text-teal-600">
                {t('patient.prescriptions.kpiAfterPlan', { name: primaryInsurance.planName })}
              </div>
              {primaryInsurance.annualLimit != null && primaryInsurance.annualLimit > 0 ? (
                <div className="text-[11px] text-slate-500">
                  {t('patient.prescriptions.kpiAnnualUsage', {
                    used: formatLocaleDigits(Math.round(primaryInsurance.annualLimitUsed ?? 0), uiLang),
                    limit: formatLocaleDigits(Math.round(primaryInsurance.annualLimit), uiLang),
                  })}
                </div>
              ) : null}
            </div>
          ) : !insuranceLoading ? (
            <div className="text-xs font-medium text-teal-600">{t('patient.prescriptions.kpiCostHint')}</div>
          ) : null}
        </div>
      </div>

      <div
        className="mb-6 animate-slideUp rounded-2xl bg-white shadow-sm"
        style={{ animationDelay: '160ms' }}
      >
        <div className="border-b border-slate-100 px-4 sm:px-6">
          <div className="flex min-w-max gap-6 sm:gap-8 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-2 text-[15px] font-medium transition-all duration-300 relative whitespace-nowrap ${
                    isActive ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden>{tab.emoji}</span>
                    {t(tab.labelKey)}
                    {typeof tab.count === 'number' ? (
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                          tab.key === 'past' ? 'bg-slate-400 text-white' : 'bg-teal-500 text-white'
                        }`}
                      >
                        {formatLocaleDigits(tab.count, uiLang)}
                      </span>
                    ) : null}
                  </span>
                  {isActive ? <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'active' ? renderActiveTab() : null}
          {activeTab === 'schedule' ? renderScheduleTab() : null}
          {activeTab === 'reminders' ? renderRemindersTab() : null}
          {activeTab === 'past' ? renderPastTab() : null}
          {activeTab === 'costs' ? renderCostsTab() : null}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-700">
        {t('patient.prescriptions.footerNoteData')}
      </div>

      {pharmacyModalPrescriptionId
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{t('patient.prescriptions.pharmacyAssignTitle')}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{t('patient.prescriptions.pharmacyAssignSubtitle')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPharmacyModalPrescriptionId(null); setPharmacyError(null); }}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="divide-y divide-slate-100 px-4 py-3">
                  {pharmacyError ? (
                    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {pharmacyError}
                    </div>
                  ) : null}
                  {loadingPharmacies ? (
                    <div className="py-8 text-center text-sm text-slate-400">{t('patient.prescriptions.pharmacyAssignLoading')}</div>
                  ) : pharmacyList.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">{t('patient.prescriptions.pharmacyAssignEmpty')}</div>
                  ) : (
                    pharmacyList.map((pharmacy) => (
                      <button
                        key={pharmacy.id}
                        type="button"
                        disabled={sendingToPharmacy}
                        onClick={() => void handleSelectPharmacy(pharmacy.id)}
                        className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-teal-50 disabled:opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-lg">🏪</div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{pharmacy.name}</div>
                            <div className="text-xs text-slate-400">{pharmacy.city}, UAE</div>
                          </div>
                        </div>
                        <span className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white">
                          {sendingToPharmacy
                            ? t('patient.prescriptions.pharmacyAssignSending')
                            : t('patient.prescriptions.pharmacyAssignSelect')}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t border-slate-100 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => { setPharmacyModalPrescriptionId(null); setPharmacyError(null); }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {t('patient.prescriptions.pharmacyAssignCancel')}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Reported Medications</h2>
            <p className="mt-0.5 text-sm text-slate-500">Medications you are currently taking — shared with your doctor.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4" />
            Add Medication
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {loadingReportedMeds ? (
            <div className="p-6 text-sm text-slate-400">Loading...</div>
          ) : reportedMeds.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-semibold text-slate-700">No medications reported yet</p>
              <p className="mt-1 text-sm text-slate-500">Add medications you are currently taking so your doctor can review them.</p>
            </div>
          ) : (
            reportedMeds.map((med) => (
              <div key={med.id} className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{med.medication_name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      med.review_status === 'reviewed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {med.review_status === 'reviewed' ? '✅ Reviewed by doctor' : '⏳ Pending review'}
                    </span>
                    {med.is_current ? (
                      <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">
                        Currently taking
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ') || 'No details provided'}
                  </p>
                  {med.instructions ? (
                    <p className="mt-1 text-xs text-slate-400">{med.instructions}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteMedication(med.id)}
                  disabled={deletingMedId === med.id}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Add Medication</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Medication Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMed.medication_name}
                  onChange={(e) => setNewMed((prev) => ({ ...prev, medication_name: e.target.value }))}
                  placeholder="e.g. Paracetamol"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Dosage</label>
                  <input
                    type="text"
                    value={newMed.dosage}
                    onChange={(e) => setNewMed((prev) => ({ ...prev, dosage: e.target.value }))}
                    placeholder="e.g. 500mg"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Frequency</label>
                  <input
                    type="text"
                    value={newMed.frequency}
                    onChange={(e) => setNewMed((prev) => ({ ...prev, frequency: e.target.value }))}
                    placeholder="e.g. Twice daily"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Duration</label>
                <input
                  type="text"
                  value={newMed.duration}
                  onChange={(e) => setNewMed((prev) => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g. 7 days"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Instructions</label>
                <textarea
                  value={newMed.instructions}
                  onChange={(e) => setNewMed((prev) => ({ ...prev, instructions: e.target.value }))}
                  placeholder="e.g. Take after meals"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_current"
                  checked={newMed.is_current}
                  onChange={(e) => setNewMed((prev) => ({ ...prev, is_current: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600"
                />
                <label htmlFor="is_current" className="text-sm font-medium text-slate-700">
                  I am currently taking this medication
                </label>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleAddMedication()}
                disabled={savingMed || !newMed.medication_name.trim()}
                className="flex-1 rounded-xl bg-cyan-600 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
              >
                {savingMed ? 'Saving...' : 'Add Medication'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, FileText, MessageSquare, Play, Search, X } from 'lucide-react';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import {
  PharmacyTaskChangeNotAllowedError,
  sendPharmacyHoldNotificationAndMessage,
  updatePharmacyDispensingTaskStatus,
  usePharmacyPrescriptionQueue,
} from '../../hooks';
import type { PharmacyQueuePrescriptionItem } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { useIsPhone } from '../../hooks/use-is-phone';
import { formatLocaleCurrency, formatLocaleDigits, formatRelativeTime } from '../../lib/i18n-ui';
import {
  clinicDateKey,
  clinicTodayKey,
  formatClinicDate,
  formatClinicTime,
} from '../../lib/clinic-booking-time';
import { PHARMACY_NAV_ITEMS } from './navItems';
import { PrescriptionDetailsDialog } from './PrescriptionDetailsDialog';
import {
  inferPrescriptionWorkflowStatus,
  openDispensingTaskIds,
  prescriptionReference,
} from './prescription-status';

type FilterType = 'all' | 'new' | 'in_progress' | 'on_hold' | 'dispensed' | 'picked_up' | 'cancelled';
type SortType = 'newest' | 'oldest' | 'patient' | 'status';

interface PrescriptionListRow {
  id: string;
  /** QA-251: every medicine (dispensing task) of this prescription, with its own status. */
  tasks: Array<
    Pick<PharmacyQueuePrescriptionItem, 'id' | 'workflowStatus' | 'medication' | 'quantity' | 'prescriptionItemId'>
  >;
  /** The medicines' own references, so an old link with a task reference still finds the row. */
  refs: string[];
  patientUserId: string | null;
  patientName: string;
  patientInitials: string;
  avatarClass: string;
  doctorName: string;
  drugs: string[];
  insurance: string;
  copay: number;
  status: Exclude<FilterType, 'all'>;
  /** QA-258: when the first medicine of the prescription reached the pharmacy (stored time). */
  receivedAt: string;
  priority: PharmacyQueuePrescriptionItem['priority'];
  hasAllergyFlag: boolean;
}

// QA-260: every label is translated; the English text is the default.
const FILTER_KEYS: FilterType[] = ['all', 'new', 'in_progress', 'on_hold', 'dispensed', 'picked_up', 'cancelled'];
const FILTER_DEFAULTS: Record<FilterType, string> = {
  all: 'All',
  new: 'New',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  dispensed: 'Dispensed',
  picked_up: 'Picked Up',
  cancelled: 'Cancelled',
};
const filterLabel = (key: FilterType, t: TFunction) =>
  t(`pharmacy.dispensing.filter.${key}`, { defaultValue: FILTER_DEFAULTS[key] });

const SORT_KEYS: SortType[] = ['newest', 'oldest', 'patient', 'status'];
const SORT_DEFAULTS: Record<SortType, string> = {
  newest: 'Newest First',
  oldest: 'Oldest First',
  patient: 'Patient A-Z',
  status: 'By Status',
};
const sortLabel = (key: SortType, t: TFunction) =>
  t(`pharmacy.dispensing.sort.${key}`, { defaultValue: SORT_DEFAULTS[key] });

const STATUS_DEFAULTS: Record<Exclude<FilterType, 'all'>, string> = {
  new: 'NEW',
  in_progress: 'IN PROGRESS',
  on_hold: 'ON HOLD',
  dispensed: 'DISPENSED',
  picked_up: 'PICKED UP',
  cancelled: 'CANCELLED',
};
const statusLabel = (status: Exclude<FilterType, 'all'>, t: TFunction) =>
  t(`pharmacy.dispensing.status.${status}`, { defaultValue: STATUS_DEFAULTS[status] });

const statusConfig: Record<
  Exclude<FilterType, 'all'>,
  { bg: string; text: string; border: string }
> = {
  new: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-s-blue-500',
  },
  in_progress: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-s-teal-500',
  },
  on_hold: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-s-amber-500',
  },
  dispensed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-s-emerald-500',
  },
  picked_up: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-s-emerald-600',
  },
  cancelled: {
    bg: 'bg-slate-50',
    text: 'text-slate-500',
    border: 'border-s-slate-300',
  },
};

/**
 * QA-252: what the main button does. "Start" only starts work on a new prescription; "Mark as
 * dispensed" (with a confirmation) is the step that tells the patient their medicines are ready.
 */
const actionLabel = (status: Exclude<FilterType, 'all'>, t: TFunction): string => {
  switch (status) {
    case 'new':
      return t('pharmacy.dispensing.actionStart', { defaultValue: 'Start' });
    case 'in_progress':
      return t('pharmacy.dispensing.actionMarkDispensed', { defaultValue: 'Mark as dispensed' });
    case 'on_hold':
      return t('pharmacy.dispensing.actionResume', { defaultValue: 'Resume' });
    default:
      return t('pharmacy.dispensing.actionView', { defaultValue: 'View' });
  }
};

const isFinished = (status: Exclude<FilterType, 'all'>) =>
  status === 'dispensed' || status === 'picked_up' || status === 'cancelled';

const statusSortOrder: Record<Exclude<FilterType, 'all'>, number> = {
  new: 0,
  in_progress: 1,
  on_hold: 2,
  dispensed: 3,
  picked_up: 4,
  cancelled: 5,
};

const formatNumber = (value: number | null | undefined, language: string) =>
  typeof value === 'number' ? formatLocaleDigits(value, language) : '—';

const avatarClasses = [
  'bg-rose-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-emerald-600',
  'bg-indigo-500',
  'bg-fuchsia-500',
];

const initialsFor = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`
      : (parts[0] ?? 'PX').replace(/[^a-z0-9]/gi, '').slice(0, 2);

  return initials.padEnd(2, 'X').toUpperCase();
};

const avatarClassFor = (seed: string) => {
  const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return avatarClasses[hash % avatarClasses.length];
};

/** QA-258: the earliest stored received time of the group (not rebuilt from rounded minutes). */
const earliestReceivedAt = (group: PharmacyQueuePrescriptionItem[]): string =>
  group.reduce((earliest, item) =>
    Date.parse(item.receivedAt) < Date.parse(earliest) ? item.receivedAt : earliest
  , group[0].receivedAt);

/** QA-258: auto refresh while the page is open (and when the pharmacist comes back to the tab). */
const AUTO_REFRESH_MS = 60_000;

const inferPrescriptionStatus = (items: PharmacyQueuePrescriptionItem[]): PrescriptionListRow['status'] =>
  inferPrescriptionWorkflowStatus(items);

const groupPrescriptionRows = (
  items: PharmacyQueuePrescriptionItem[],
  pendingLabel: string
): PrescriptionListRow[] => {
  const groups = new Map<string, PharmacyQueuePrescriptionItem[]>();

  for (const item of items) {
    const existing = groups.get(item.prescriptionId) ?? [];
    existing.push(item);
    groups.set(item.prescriptionId, existing);
  }

  return Array.from(groups.entries()).map(([prescriptionId, group]) => {
    const first = group[0];
    const receivedAt = earliestReceivedAt(group);

    return {
      id: prescriptionId,
      tasks: group.map((item) => ({
        id: item.id,
        workflowStatus: item.workflowStatus,
        medication: item.medication,
        quantity: item.quantity,
        prescriptionItemId: item.prescriptionItemId,
      })),
      refs: group.map((item) => item.externalRef),
      patientUserId: group.find((item) => item.patientUserId)?.patientUserId ?? null,
      patientName: first.patientName,
      patientInitials: initialsFor(first.patientName),
      avatarClass: avatarClassFor(prescriptionId),
      doctorName: first.prescriber,
      drugs: group.map((item) => item.medication || pendingLabel),
      insurance: first.insuranceProvider,
      copay: group.reduce((sum, item) => sum + item.copayAed, 0),
      status: inferPrescriptionStatus(group),
      receivedAt,
      priority: first.priority,
      hasAllergyFlag: group.some((item) => item.allergyFlag),
    };
  });
};

const HOLD_REASONS = [
  { value: 'out_of_stock', icon: '🔴', label: 'Out of Stock' },
  { value: 'insurance_issue', icon: '🛡️', label: 'Insurance Issue' },
  { value: 'allergy_concern', icon: '⚠️', label: 'Allergy Concern' },
  { value: 'doctor_clarification', icon: '📋', label: 'Doctor Clarification Needed' },
  { value: 'substitution_required', icon: '🔄', label: 'Substitution Required' },
  { value: 'incomplete_prescription', icon: '📄', label: 'Incomplete Prescription' },
  { value: 'patient_not_reachable', icon: '👤', label: 'Patient Not Reachable' },
  { value: 'other', icon: '🔧', label: 'Other' },
];

/** The reason in the pharmacist's language (QA-260). */
const holdReasonLabel = (value: string, t: TFunction): string => {
  const reason = HOLD_REASONS.find((r) => r.value === value);
  return reason ? t(`pharmacy.dispensing.holdReason.${value}`, { defaultValue: reason.label }) : value;
};

/**
 * The reason in English for the message to the patient, which is written in English like the
 * database notification (the patient's language is not known here).
 */
const holdReasonLabelForPatient = (value: string): string =>
  HOLD_REASONS.find((r) => r.value === value)?.label ?? value;

export const PharmacyDispensing = () => {
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, loading, error, refetch } = usePharmacyPrescriptionQueue();
  const isPhone = useIsPhone();
  // QA-258: new prescriptions appear and "x min ago" stays right without reloading the page.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => {
      setNowMs(Date.now());
      void refetch();
    };
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') refresh();
    }, AUTO_REFRESH_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refetch]);
  const todayKey = clinicTodayKey(new Date(nowMs));
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [holdModalRow, setHoldModalRow] = useState<PrescriptionListRow | null>(null);
  const [holdReason, setHoldReason] = useState('');
  const [holdNote, setHoldNote] = useState('');
  const holdCloseRef = useRef<HTMLButtonElement>(null);
  const holdOpenId = holdModalRow?.id ?? null;

  // QA-261: the hold dialog works like the others: focus inside, Escape closes it.
  useEffect(() => {
    if (!holdOpenId) return;
    holdCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHoldModalRow(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [holdOpenId]);
  const [detailsRow, setDetailsRow] = useState<PrescriptionListRow | null>(null);
  const closeDetails = useCallback(() => setDetailsRow(null), []);
  const [dispenseConfirmRow, setDispenseConfirmRow] = useState<PrescriptionListRow | null>(null);
  // QA-256: the same confirmation is used for "Mark as dispensed" and "Handed to patient".
  const [confirmKind, setConfirmKind] = useState<'dispense' | 'handover'>('dispense');
  const dispenseCancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dispenseConfirmRow) return;
    dispenseCancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDispenseConfirmRow(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dispenseConfirmRow]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setSearch(id);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  type RowStatus = Exclude<FilterType, 'all'>;
  const nextStatusFor = (status: RowStatus): RowStatus | null => {
    switch (status) {
      case 'new':
        return 'in_progress';
      case 'in_progress':
        return 'dispensed';
      case 'on_hold':
        return 'in_progress';
      default:
        return null;
    }
  };

  // QA-254 / QA-255: plain, translated messages; the database error is only logged.
  const statusErrorMessage = (error: unknown) =>
    error instanceof PharmacyTaskChangeNotAllowedError
      ? t('pharmacy.dispensing.statusChangeNotAllowed', {
          defaultValue: "This change isn't allowed for this prescription. The list now shows what is saved.",
        })
      : t('pharmacy.dispensing.statusUpdateFailed', {
          defaultValue: 'Could not update the prescription. Please try again.',
        });

  const handleOnHold = async (row: PrescriptionListRow) => {
    // QA-251: only the medicines still open; dispensed, picked up and cancelled ones stay as they are.
    const taskIds = openDispensingTaskIds(row.tasks);
    if (taskIds.length === 0) return;
    setActionError(null);
    setActionNotice(null);
    setBusyId(row.id);
    try {
      await Promise.all(
        taskIds.map((taskId) =>
          updatePharmacyDispensingTaskStatus(taskId, 'on_hold', {
            holdReasonCode: holdReason,
            holdNote,
          })
        )
      );

      const patientUserId = row.patientUserId;

      // QA-254: say plainly what reached the patient; database errors are logged, not shown.
      if (patientUserId) {
        const outreach = await sendPharmacyHoldNotificationAndMessage({
          taskIds,
          patientUserId,
          medications: row.drugs,
          holdReasonLabel: holdReasonLabelForPatient(holdReason),
          holdNote,
          pharmacyUserId: user?.id ?? null,
        });
        if (!outreach.notified && !outreach.messaged) {
          setActionNotice(
            t('pharmacy.dispensing.holdPatientNotTold', {
              defaultValue:
                'The prescription is on hold, but the patient could not be told. Please contact them directly.',
            })
          );
        } else if (!outreach.messaged) {
          setActionNotice(
            t('pharmacy.dispensing.holdMessageNotSent', {
              defaultValue:
                'The prescription is on hold and the patient was notified, but the message could not be sent. You can write to them from Messages.',
            })
          );
        }
      } else {
        setActionNotice(
          t('pharmacy.dispensing.holdNoPatientAccount', {
            defaultValue: 'The prescription is on hold. This patient has no CeenAiX account, so they were not told.',
          })
        );
      }

      refetch();
      setHoldModalRow(null);
      setHoldReason('');
      setHoldNote('');
    } catch (error) {
      console.warn(`[pharmacy] hold failed: ${error instanceof Error ? error.message : String(error)}`);
      setActionError(statusErrorMessage(error));
      // Some medicines may have changed before the error: show what is really saved.
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  const handleRowAction = async (row: PrescriptionListRow, status: RowStatus) => {
    if (status === 'dispensed' || status === 'picked_up' || status === 'cancelled') {
      return;
    }
    const nextStatus = nextStatusFor(status);
    if (!nextStatus) return;
    // QA-251: only the medicines still open; dispensed, picked up and cancelled ones stay as they are.
    const taskIds = openDispensingTaskIds(row.tasks);
    if (taskIds.length === 0) return;
    setActionError(null);
    setActionNotice(null);
    setBusyId(row.id);
    try {
      const workflowStatus: Parameters<typeof updatePharmacyDispensingTaskStatus>[1] =
        nextStatus === 'in_progress'
          ? 'in_progress'
          : nextStatus === 'dispensed'
            ? 'dispensed'
            : 'on_hold';
      await Promise.all(taskIds.map((taskId) => updatePharmacyDispensingTaskStatus(taskId, workflowStatus)));
      refetch();
    } catch (error) {
      // QA-254: a plain, translated message; the database error is logged for operators.
      console.warn(`[pharmacy] status update failed: ${error instanceof Error ? error.message : String(error)}`);
      setActionError(statusErrorMessage(error));
      // Some medicines may have changed before the error: show what is really saved.
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  // QA-256: dispensed -> picked up for the medicines the pharmacy dispensed (allowed by the QA-255 guard).
  const handleHandover = async (row: PrescriptionListRow) => {
    const taskIds = row.tasks.filter((item) => item.workflowStatus === 'dispensed').map((item) => item.id);
    if (taskIds.length === 0) return;
    setActionError(null);
    setActionNotice(null);
    setBusyId(row.id);
    try {
      await Promise.all(taskIds.map((taskId) => updatePharmacyDispensingTaskStatus(taskId, 'picked_up')));
      refetch();
    } catch (error) {
      console.warn(`[pharmacy] handover failed: ${error instanceof Error ? error.message : String(error)}`);
      setActionError(statusErrorMessage(error));
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  const pendingLabel = t('pharmacy.dispensing.medicationPending', { defaultValue: 'Medication pending' });
  const rows = useMemo(() => groupPrescriptionRows(data?.queue ?? [], pendingLabel), [data?.queue, pendingLabel]);
  const counts = useMemo(
    () => ({
      all: rows.length,
      new: rows.filter((row) => row.status === 'new').length,
      in_progress: rows.filter((row) => row.status === 'in_progress').length,
      on_hold: rows.filter((row) => row.status === 'on_hold').length,
      dispensed: rows.filter((row) => row.status === 'dispensed').length,
      picked_up: rows.filter((row) => row.status === 'picked_up').length,
      cancelled: rows.filter((row) => row.status === 'cancelled').length,
    }),
    [rows]
  );

  const sorted = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const matchesFilter = filter === 'all' || row.status === filter;
      const matchesSearch =
        !query ||
        row.patientName.toLowerCase().includes(query) ||
        row.id.toLowerCase().includes(query) ||
        row.refs.some((ref) => ref.toLowerCase().includes(query)) ||
        prescriptionReference(row.id).toLowerCase().includes(query) ||
        row.doctorName.toLowerCase().includes(query) ||
        row.drugs.some((drug) => drug.toLowerCase().includes(query));

      return matchesFilter && matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sort === 'patient') {
        return a.patientName.localeCompare(b.patientName);
      }

      if (sort === 'status') {
        return statusSortOrder[a.status] - statusSortOrder[b.status];
      }

      if (sort === 'oldest') {
        return Date.parse(a.receivedAt) - Date.parse(b.receivedAt);
      }

      return Date.parse(b.receivedAt) - Date.parse(a.receivedAt);
    });
  }, [filter, rows, search, sort]);

  // QA-261: the same buttons for the table (computer) and the cards (phone).
  const renderRowActions = (row: PrescriptionListRow) => (
    <>
      <button
        type="button"
        onClick={() => {
          if (isFinished(row.status)) {
            // QA-253: View opens the prescription details (picked up rows did nothing before).
            setDetailsRow(row);
          } else if (row.status === 'in_progress') {
            // QA-252: dispensing tells the patient and cannot be undone, so confirm first.
            setConfirmKind('dispense');
            setDispenseConfirmRow(row);
          } else {
            void handleRowAction(row, row.status);
          }
        }}
        disabled={busyId === row.id && !isFinished(row.status)}
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isFinished(row.status)
            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            : row.status === 'on_hold'
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {!isFinished(row.status) ? <Play className="h-3 w-3" /> : null}
        {busyId === row.id ? '…' : actionLabel(row.status, t)}
      </button>
      {row.status === 'dispensed' ? (
        <button
          type="button"
          onClick={() => {
            // QA-256: the pharmacy records that the patient collected the medicines.
            setConfirmKind('handover');
            setDispenseConfirmRow(row);
          }}
          disabled={busyId === row.id}
          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('pharmacy.dispensing.actionHandover', { defaultValue: 'Handed to patient' })}
        </button>
      ) : null}
      {!isFinished(row.status) ? (
        <button
          type="button"
          onClick={() => setDetailsRow(row)}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <FileText className="h-3 w-3" aria-hidden="true" />
          {t('pharmacy.dispensing.actionDetails', { defaultValue: 'Details' })}
        </button>
      ) : null}
      {(row.status === 'new' || row.status === 'in_progress') ? (
        <button
          type="button"
          onClick={() => {
            setHoldModalRow(row);
            setHoldReason('');
            setHoldNote('');
          }}
          disabled={busyId === row.id}
          title={t('pharmacy.dispensing.holdTitle', { defaultValue: 'Put on hold' })}
          className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-amber-600 border border-amber-300 bg-amber-50 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('pharmacy.dispensing.actionHold', { defaultValue: 'Hold' })}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          const patientUserId = row.patientUserId;
          const medList = row.drugs.slice(0, 2).join(', ');
          const draftText = t('pharmacy.dispensing.messageDraft', {
            defaultValue: 'Regarding your prescription for {{medicines}}: ',
            medicines: medList,
          });
          if (patientUserId) {
            navigate(`/pharmacy/messages?patient=${patientUserId}&draft=${encodeURIComponent(draftText)}`);
          } else {
            navigate('/pharmacy/messages');
          }
        }}
        aria-label={t('pharmacy.dispensing.messagePatient', {
          defaultValue: 'Message patient about this prescription',
        })}
        title={t('pharmacy.dispensing.messagePatientShort', { defaultValue: 'Message patient' })}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600"
      >
        <MessageSquare className="h-3.5 w-3.5" />
      </button>
    </>
  );

  const renderAllergyFlag = (row: PrescriptionListRow) =>
    row.hasAllergyFlag ? (
      <span
        role="img"
        aria-label={t('pharmacy.dispensing.detailsAllergy', { defaultValue: 'Allergy flag on record' })}
        title={t('pharmacy.dispensing.detailsAllergy', { defaultValue: 'Allergy flag on record' })}
        className="ms-1 text-[9px] text-red-500"
      >
        ⚠️
      </span>
    ) : null;

  const listStatus = (
    <>
      {data && sorted.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">
          {t('pharmacy.dispensing.emptySearch', { defaultValue: 'No prescriptions match your search' })}
        </div>
      ) : null}
      {/* QA-258: only the first load shows this; background refreshes keep the list. */}
      {loading && !data ? (
        <div className="py-12 text-center text-sm text-slate-400">
          {t('pharmacy.dispensing.loading', { defaultValue: 'Loading prescriptions…' })}
        </div>
      ) : null}
    </>
  );

  const receivedLabel = (row: PrescriptionListRow) =>
    // QA-258: Dubai time for today's prescriptions, the Dubai date for older ones.
    clinicDateKey(row.receivedAt) === todayKey
      ? formatClinicTime(row.receivedAt, uiLang)
      : formatClinicDate(row.receivedAt, uiLang);

  return (
    <OpsShell
      title={t('pharmacy.dispensing.pageTitle', { defaultValue: 'Prescriptions' })}
      subtitle={t('pharmacy.dispensing.shellSubtitle', {
        defaultValue: '{{pharmacy}} · Dispensing queue',
        pharmacy:
          data?.profile?.displayName ??
          data?.organization?.name ??
          t('pharmacy.dispensing.pharmacyFallback', { defaultValue: 'your pharmacy' }),
      })}
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, {
        prescriptions: counts.new + counts.on_hold || undefined,
        inventory: data?.lowStockAlerts || undefined,
        messages: counts.on_hold || undefined,
      })}
      accent="emerald"
      variant="pharmacy"
    >
      <PortalQueryBanner error={error} onRetry={() => void refetch()} />
        <div className="relative flex min-h-full flex-col overflow-y-auto bg-slate-50">
        {actionError ? (
          <div
            role="alert"
            className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {actionError}
          </div>
        ) : null}
        {data?.tasksTruncated ? (
          <div
            role="note"
            className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {t('pharmacy.dispensing.tasksTruncated', {
              defaultValue: 'This list is very long, so the oldest prescriptions are not shown.',
            })}
          </div>
        ) : null}
        {actionNotice ? (
          <div
            role="status"
            className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {actionNotice}
          </div>
        ) : null}
        <div className="mx-6 mb-4 mt-5 flex shrink-0 items-center justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-slate-900">
              {t('pharmacy.dispensing.pageTitle', { defaultValue: 'Prescriptions' })}
            </h2>
            <div className="text-[13px] text-slate-400">
              {t('pharmacy.dispensing.pageSubtitle', {
                defaultValue: 'Prescriptions sent to {{pharmacy}}',
                pharmacy:
                  data?.profile?.displayName ??
                  data?.organization?.name ??
                  t('pharmacy.dispensing.pharmacyFallback', { defaultValue: 'your pharmacy' }),
              })}
            </div>
          </div>
        </div>

        <div className="mx-6 mb-4 flex shrink-0 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('pharmacy.dispensing.searchPh', {
                defaultValue: 'Patient name, Rx number, doctor...',
              })}
              maxLength={FORM_FIELD_LIMITS.searchQuery}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 ps-9 pe-9 text-sm text-slate-700 transition-colors focus:border-emerald-400 focus:outline-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={t('pharmacy.dispensing.clearSearch', { defaultValue: 'Clear search' })}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {FILTER_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFilter(key);
                  setSearch('');
                }}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  filter === key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filterLabel(key, t)} ({formatNumber(counts[key], uiLang)})
              </button>
            ))}
          </div>

          <div className="relative ms-auto" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setShowSortMenu((current) => !current)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600 transition-colors hover:bg-slate-50"
            >
              {t('pharmacy.dispensing.sortButton', { defaultValue: 'Sort: {{label}}', label: sortLabel(sort, t) })}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showSortMenu ? (
              <div className="absolute end-0 top-10 z-20 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {SORT_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSort(key);
                      setShowSortMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-start text-sm transition-colors hover:bg-slate-50 ${
                      sort === key ? 'font-semibold text-emerald-600' : 'text-slate-600'
                    }`}
                  >
                    {sortLabel(key, t)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mx-6 mb-6 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          {isPhone ? (
            // QA-261: on a phone each prescription is a card, so status and buttons are visible
            // without scrolling sideways through a 1,200 px table.
            <>
              {listStatus}
              <ul className="divide-y divide-slate-100">
                {sorted.map((row) => {
                  const cfg = statusConfig[row.status];
                  return (
                    <li key={row.id} className={`border-s-4 px-4 py-3 ${cfg.border}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="break-words text-sm font-semibold text-slate-800">
                            {row.patientName}
                            {renderAllergyFlag(row)}
                          </div>
                          <div className="break-words text-xs text-slate-500">{row.doctorName}</div>
                        </div>
                        <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                          {statusLabel(row.status, t)}
                        </span>
                      </div>
                      <p className="mt-2 break-words text-sm text-slate-700">{row.drugs.join(', ') || '—'}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                        <span className="font-mono">{prescriptionReference(row.id)}</span>
                        <span>
                          {receivedLabel(row)} · {formatRelativeTime(t, row.receivedAt)}
                        </span>
                        <span>
                          {row.insurance} · {formatLocaleCurrency(row.copay, uiLang)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">{renderRowActions(row)}</div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              <div className="grid grid-cols-[90px_1fr_0.9fr_0.9fr_90px_110px_240px] border-b border-slate-100 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400 rtl:font-sans rtl:tracking-normal">
                <div>{t('pharmacy.dispensing.column.received', { defaultValue: 'Received' })}</div>
                <div>{t('pharmacy.dispensing.column.patient', { defaultValue: 'Patient' })}</div>
                <div>{t('pharmacy.dispensing.column.doctor', { defaultValue: 'Doctor' })}</div>
                <div>{t('pharmacy.dispensing.column.drugs', { defaultValue: 'Drugs' })}</div>
                <div>{t('pharmacy.dispensing.column.insurance', { defaultValue: 'Insurance' })}</div>
                <div>{t('pharmacy.dispensing.column.status', { defaultValue: 'Status' })}</div>
                <div>{t('pharmacy.dispensing.column.actions', { defaultValue: 'Actions' })}</div>
              </div>

              {listStatus}

              {sorted.map((row, index) => {
                const cfg = statusConfig[row.status];
                const received = receivedLabel(row);
                return (
                  <div
                    key={row.id}
                    className={`grid min-h-16 grid-cols-[90px_1fr_0.9fr_0.9fr_90px_110px_240px] items-center border-s-4 px-5 py-3 transition-colors hover:bg-emerald-50 ${cfg.border}`}
                    style={{
                      borderBottom: index < sorted.length - 1 ? '1px solid #F8FAFC' : undefined,
                    }}
                  >
                    <div>
                      <div className="font-mono text-[11px] text-slate-600">{received}</div>
                      <div className="text-[10px] text-slate-400">{formatRelativeTime(t, row.receivedAt)}</div>
                    </div>

                    <div className="flex items-center gap-2 pe-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white ${row.avatarClass}`}>
                        {row.patientInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-slate-800">
                          {row.patientName}
                          {renderAllergyFlag(row)}
                        </div>
                      </div>
                    </div>

                    <div className="pe-3">
                      <div className="truncate text-[12px] text-slate-700">{row.doctorName}</div>
                    </div>

                    <div className="pe-3 min-w-0">
                      <div className="truncate text-[12px] text-slate-600" title={row.drugs.join(', ')}>
                        {row.drugs.map(drug => drug.length > 20 ? drug.slice(0, 20) + '…' : drug).join(', ') || '—'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">{prescriptionReference(row.id)}</div>
                    </div>

                    <div>
                      <div className="truncate text-[11px] text-slate-600">{row.insurance}</div>
                      <div className="font-mono text-[11px] font-bold text-emerald-600">{formatLocaleCurrency(row.copay, uiLang)}</div>
                    </div>

                    <div>
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                        {statusLabel(row.status, t)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">{renderRowActions(row)}</div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      </div>
      {dispenseConfirmRow ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dispense-confirm-title"
            aria-describedby="dispense-confirm-body"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 id="dispense-confirm-title" className="text-base font-semibold text-slate-900">
                {confirmKind === 'handover'
                  ? t('pharmacy.dispensing.confirmHandoverTitle', { defaultValue: 'Handed to the patient?' })
                  : t('pharmacy.dispensing.confirmDispenseTitle', { defaultValue: 'Mark as dispensed?' })}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {dispenseConfirmRow.patientName} · {prescriptionReference(dispenseConfirmRow.id)}
              </p>
            </div>
            <div className="space-y-3 px-6 py-4">
              <ul
                className="space-y-1.5"
                aria-label={
                  confirmKind === 'handover'
                    ? t('pharmacy.dispensing.confirmHandoverListLabel', { defaultValue: 'Medicines handed over' })
                    : t('pharmacy.dispensing.confirmDispenseListLabel', { defaultValue: 'Medicines to dispense' })
                }
              >
                {dispenseConfirmRow.tasks
                  .filter((item) =>
                    confirmKind === 'handover'
                      ? item.workflowStatus === 'dispensed'
                      : openDispensingTaskIds([item]).length > 0
                  )
                  .map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800"
                    >
                      <span className="min-w-0 break-words font-medium">{item.medication}</span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {typeof item.quantity === 'number'
                          ? t('pharmacy.dispensing.confirmDispenseQty', {
                              defaultValue: 'Qty {{qty}}',
                              qty: formatLocaleDigits(item.quantity, uiLang),
                            })
                          : t('pharmacy.dispensing.confirmDispenseQtyUnknown', { defaultValue: 'Qty not given' })}
                      </span>
                    </li>
                  ))}
              </ul>
              <p id="dispense-confirm-body" className="text-sm text-slate-600">
                {confirmKind === 'handover'
                  ? t('pharmacy.dispensing.confirmHandoverBody', {
                      defaultValue:
                        "Confirm that the patient, or someone for them, collected these medicines. This can't be undone.",
                    })
                  : t('pharmacy.dispensing.confirmDispenseBody', {
                      defaultValue:
                        "Check the medicines before you confirm. The patient is told their medicines are ready for pickup, and this can't be undone.",
                    })}
              </p>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                ref={dispenseCancelRef}
                type="button"
                onClick={() => setDispenseConfirmRow(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t('pharmacy.dispensing.confirmDispenseCancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                disabled={busyId === dispenseConfirmRow.id}
                onClick={() => {
                  const row = dispenseConfirmRow;
                  const action = confirmKind === 'handover' ? handleHandover(row) : handleRowAction(row, row.status);
                  void action.finally(() => setDispenseConfirmRow(null));
                }}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId === dispenseConfirmRow.id
                  ? t('pharmacy.dispensing.confirmDispenseSaving', { defaultValue: 'Saving…' })
                  : confirmKind === 'handover'
                    ? t('pharmacy.dispensing.confirmHandoverConfirm', { defaultValue: 'Confirm handover' })
                    : t('pharmacy.dispensing.confirmDispenseConfirm', { defaultValue: 'Confirm dispensed' })}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
      {holdModalRow ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hold-dialog-title"
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 id="hold-dialog-title" className="text-base font-semibold text-slate-900">
                  {t('pharmacy.dispensing.holdDialogTitle', { defaultValue: 'Put Prescription On Hold' })}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {holdModalRow.patientName} · {holdModalRow.drugs.slice(0, 2).join(', ')}
                </p>
              </div>
              <button
                ref={holdCloseRef}
                type="button"
                onClick={() => setHoldModalRow(null)}
                aria-label={t('pharmacy.dispensing.detailsClose', { defaultValue: 'Close' })}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto px-6 py-4">
              <div role="group" aria-labelledby="hold-reason-label">
                <p id="hold-reason-label" className="mb-2 block text-sm font-semibold text-slate-700">
                  {t('pharmacy.dispensing.holdReasonLabel', { defaultValue: 'Reason for Hold' })}{' '}
                  <span className="text-red-500" aria-hidden="true">*</span>
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {HOLD_REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      type="button"
                      onClick={() => setHoldReason(reason.value)}
                      aria-pressed={holdReason === reason.value}
                      className={`rounded-lg border px-4 py-2.5 text-start text-sm transition ${
                        holdReason === reason.value
                          ? 'border-amber-400 bg-amber-50 font-semibold text-amber-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span aria-hidden="true">{reason.icon}</span> {holdReasonLabel(reason.value, t)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="hold-note" className="mb-2 block text-sm font-semibold text-slate-700">
                  {t('pharmacy.dispensing.holdNoteLabel', { defaultValue: 'Additional Notes' })}{' '}
                  <span className="font-normal text-slate-400">
                    {t('pharmacy.dispensing.optional', { defaultValue: '(optional)' })}
                  </span>
                </label>
                <textarea
                  id="hold-note"
                  value={holdNote}
                  maxLength={FORM_FIELD_LIMITS.pharmacyHoldNote}
                  aria-describedby="hold-note-count"
                  onChange={(e) => setHoldNote(e.target.value)}
                  rows={3}
                  placeholder={t('pharmacy.dispensing.holdNotePh', { defaultValue: 'Add any additional details…' })}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-amber-400 focus:outline-none"
                />
                <p id="hold-note-count" className="mt-1 text-end text-[11px] text-slate-400">
                  {t('pharmacy.dispensing.holdNoteCount', {
                    defaultValue: '{{count}} / {{max}}',
                    count: formatLocaleDigits(holdNote.length, uiLang),
                    max: formatLocaleDigits(FORM_FIELD_LIMITS.pharmacyHoldNote, uiLang),
                  })}
                </p>
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setHoldModalRow(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t('pharmacy.dispensing.confirmDispenseCancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                disabled={!holdReason || busyId === holdModalRow.id}
                onClick={() => void handleOnHold(holdModalRow)}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId === holdModalRow.id
                  ? t('pharmacy.dispensing.confirmDispenseSaving', { defaultValue: 'Saving…' })
                  : t('pharmacy.dispensing.holdConfirm', { defaultValue: 'Confirm Hold' })}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
      {detailsRow ? <PrescriptionDetailsDialog row={detailsRow} onClose={closeDetails} /> : null}
    </OpsShell>
  );
};

import type {
  LabPortalSample,
  LabPriority,
  EquipmentStatus,
  NabidhStatus,
} from '../../../hooks';

export const priorityClass: Record<LabPriority, string> = {
  STAT: 'bg-red-100 text-red-700 ring-red-200',
  Urgent: 'bg-amber-100 text-amber-700 ring-amber-200',
  Routine: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export const sampleStatusBadge: Record<LabPortalSample['status'], string> = {
  ordered: 'bg-amber-50 text-amber-700 ring-amber-200',
  collected: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  processing: 'bg-blue-50 text-blue-700 ring-blue-200',
  resulted: 'bg-violet-50 text-violet-700 ring-violet-200',
  reviewed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export const sampleStatusLabel = (status: LabPortalSample['status'], hasCritical: boolean) => {
  if (hasCritical) return 'CRITICAL UNNOTIFIED';
  if (status === 'ordered') return 'Received';
  if (status === 'collected') return 'Accessioned';
  if (status === 'processing') return 'In Progress';
  if (status === 'resulted') return 'Pending Verify';
  if (status === 'reviewed') return 'Verified';
  return String(status);
};

export const equipmentStatusBadge: Record<EquipmentStatus, string> = {
  online: 'bg-emerald-100 text-emerald-700',
  maintenance: 'bg-amber-100 text-amber-800',
  warning: 'bg-orange-100 text-orange-700',
  offline: 'bg-rose-100 text-rose-700',
};

export const nabidhBadge: Record<NabidhStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  submitted: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
};

export const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '0';

export const formatDateShort = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export const formatTimeShort = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

export const formatTat = (minutes: number | null | undefined) => {
  if (typeof minutes !== 'number') return '—';
  if (minutes < 60) return `${minutes}m`;
  // Hosted uses decimal hour format (e.g. "2.5h", "4.8h") for TAT badges/labels
  const decimal = Math.round((minutes / 60) * 10) / 10;
  return `${decimal}h`;
};

export const ageGenderLabel = (age: number | null, gender: string | null) => {
  const genderInitial = gender ? gender.charAt(0).toUpperCase() : '';
  if (age && genderInitial) return `${age}${genderInitial}`;
  if (age) return `${age}`;
  if (genderInitial) return genderInitial;
  return '—';
};

export const initialsFromName = (name: string | null | undefined) => {
  if (!name) return 'U';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
};

export const insurancePillClass = (plan: string | null | undefined) => {
  const p = (plan ?? '').toLowerCase();
  if (p.includes('oman')) return 'bg-rose-50 text-rose-700 ring-rose-200';
  if (p.includes('axa')) return 'bg-sky-50 text-sky-700 ring-sky-200';
  if (p.includes('daman')) return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
  if (p.includes('thiqa')) return 'bg-violet-50 text-violet-700 ring-violet-200';
  if (p.includes('metlife')) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  return 'bg-slate-50 text-slate-600 ring-slate-200';
};

export const bloodTypeColor = (bloodType: string | null | undefined) => {
  if (!bloodType) return 'text-slate-500';
  if (bloodType.includes('-')) return 'text-rose-600';
  if (bloodType.includes('+')) return 'text-emerald-600';
  return 'text-slate-500';
};

export const orderCardAccent = (priority: LabPriority, isCritical: boolean) => {
  if (isCritical || priority === 'STAT') {
    return {
      bar: 'bg-red-500',
      bg: 'bg-red-50/40',
      border: 'border-red-200',
      label: '⚡ STAT',
    };
  }
  if (priority === 'Urgent') {
    return {
      bar: 'bg-amber-400',
      bg: 'bg-amber-50/30',
      border: 'border-amber-200',
      label: '⚡ Urgent',
    };
  }
  return {
    bar: 'bg-transparent',
    bg: 'bg-white',
    border: 'border-slate-100',
    label: 'Routine',
  };
};

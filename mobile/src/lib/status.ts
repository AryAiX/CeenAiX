import type { AppointmentStatus, LabItemStatusCategory, PreVisitAssessmentStatus } from '@ceenaix/types';
import type { Tone } from '@/theme/tokens';

export const appointmentStatusTone: Record<AppointmentStatus, Tone> = {
  scheduled: 'info',
  confirmed: 'brand',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'neutral',
  no_show: 'danger',
};

export const preVisitStatusTone: Record<PreVisitAssessmentStatus, Tone> = {
  not_started: 'warning',
  in_progress: 'info',
  completed: 'success',
  reviewed: 'success',
};

export const labStatusTone = (status: string): Tone =>
  status === 'reviewed' || status === 'resulted' ? 'success' : status === 'processing' || status === 'collected' ? 'info' : 'warning';

export const prescriptionStatusTone = (status: string): Tone =>
  status === 'active' ? 'brand' : status === 'completed' ? 'success' : 'neutral';

export const labItemTone: Record<LabItemStatusCategory, Tone> = {
  normal: 'success',
  borderline: 'warning',
  high: 'warning',
  low: 'warning',
  critical: 'danger',
  pending: 'neutral',
};

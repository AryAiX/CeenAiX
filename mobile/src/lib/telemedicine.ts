import type { Appointment } from '@ceenaix/types';
import { supabase } from './supabase';

// Mirrors `src/lib/telemedicine.ts` on the web: same join window (10 minutes
// before start until 15 minutes after the scheduled end) and the same
// `telemedicine-token` Edge Function contract.

export type TelemedicineJoinWindowStatus = 'open' | 'too_early' | 'ended' | 'not_virtual' | 'inactive';

export interface TelemedicineToken {
  token: string;
  serverUrl: string;
  roomName: string;
  appointmentId: string;
  participantName: string;
  role: 'patient' | 'doctor';
  expiresAt: string;
}

const ACTIVE_STATUSES = new Set<Appointment['status']>(['scheduled', 'confirmed', 'in_progress']);
export const JOIN_LEAD_MS = 10 * 60 * 1000;
const JOIN_END_GRACE_MS = 15 * 60 * 1000;

export function getJoinWindowStatus(
  appointment: Pick<Appointment, 'type' | 'status' | 'scheduled_at' | 'duration_minutes'>,
  nowMs = Date.now()
): TelemedicineJoinWindowStatus {
  if (appointment.type !== 'virtual') return 'not_virtual';
  if (!ACTIVE_STATUSES.has(appointment.status)) return 'inactive';
  const scheduledAtMs = new Date(appointment.scheduled_at).getTime();
  if (!Number.isFinite(scheduledAtMs)) return 'inactive';
  const startsAtMs = scheduledAtMs - JOIN_LEAD_MS;
  const endsAtMs = scheduledAtMs + appointment.duration_minutes * 60_000 + JOIN_END_GRACE_MS;
  if (nowMs < startsAtMs) return 'too_early';
  if (nowMs > endsAtMs) return 'ended';
  return 'open';
}

export async function requestTelemedicineToken(appointmentId: string): Promise<TelemedicineToken> {
  const id = appointmentId.trim();
  if (!id) throw new Error('Appointment ID is required.');

  const { data, error } = await supabase.functions.invoke('telemedicine-token', {
    body: { appointment_id: id },
  });
  if (error) throw new Error(error.message || 'Unable to prepare the video session.');

  const payload = data as Partial<TelemedicineToken> | null;
  if (!payload?.token || !payload.serverUrl || !payload.roomName || !payload.appointmentId) {
    throw new Error('Video session response was incomplete.');
  }
  return {
    token: payload.token,
    serverUrl: payload.serverUrl,
    roomName: payload.roomName,
    appointmentId: payload.appointmentId,
    participantName: payload.participantName ?? 'Participant',
    role: payload.role === 'doctor' ? 'doctor' : 'patient',
    expiresAt: payload.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

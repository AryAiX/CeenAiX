import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from './supabase';
import {
  getTelemedicineJoinWindowStatus,
  isTelemedicineJoinOpen,
  requestTelemedicineToken,
} from './telemedicine';
import type { Appointment } from '../types';

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

const appointmentAt = (scheduledAt: string): Pick<Appointment, 'type' | 'status' | 'scheduled_at' | 'duration_minutes'> => ({
  type: 'virtual',
  status: 'confirmed',
  scheduled_at: scheduledAt,
  duration_minutes: 30,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('telemedicine join window', () => {
  it('opens 10 minutes before a virtual active appointment and allows a short grace period after', () => {
    const appointment = appointmentAt('2026-07-19T12:00:00.000Z');

    expect(getTelemedicineJoinWindowStatus(appointment, Date.parse('2026-07-19T11:49:59.000Z'))).toBe('too_early');
    expect(isTelemedicineJoinOpen(appointment, Date.parse('2026-07-19T11:50:00.000Z'))).toBe(true);
    expect(isTelemedicineJoinOpen(appointment, Date.parse('2026-07-19T12:44:59.000Z'))).toBe(true);
    expect(getTelemedicineJoinWindowStatus(appointment, Date.parse('2026-07-19T12:45:01.000Z'))).toBe('ended');
  });

  it('rejects in-person or inactive appointments', () => {
    expect(getTelemedicineJoinWindowStatus({ ...appointmentAt('2026-07-19T12:00:00.000Z'), type: 'in_person' })).toBe('not_virtual');
    expect(getTelemedicineJoinWindowStatus({ ...appointmentAt('2026-07-19T12:00:00.000Z'), status: 'cancelled' })).toBe('inactive');
  });
});

describe('requestTelemedicineToken', () => {
  it('invokes the appointment-scoped Edge Function', async () => {
    const invokeMock = vi.mocked(supabase.functions.invoke);
    invokeMock.mockResolvedValue({
      data: {
        token: 'token',
        serverUrl: 'wss://livekit.example.test',
        roomName: 'ceenaix-telemedicine-appt-1',
        appointmentId: 'appt-1',
        participantName: 'Aisha Patient',
        role: 'patient',
        expiresAt: '2026-07-19T13:00:00.000Z',
      },
      error: null,
    });

    const result = await requestTelemedicineToken(' appt-1 ');

    expect(invokeMock).toHaveBeenCalledWith('telemedicine-token', {
      body: { appointment_id: 'appt-1' },
    });
    expect(result.roomName).toBe('ceenaix-telemedicine-appt-1');
    expect(result.role).toBe('patient');
  });

  it('throws when the Edge Function rejects the request', async () => {
    const invokeMock = vi.mocked(supabase.functions.invoke);
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: 'The video room opens 10 minutes before the appointment.' },
    });

    await expect(requestTelemedicineToken('appt-1')).rejects.toThrow('The video room opens 10 minutes before the appointment.');
  });
});

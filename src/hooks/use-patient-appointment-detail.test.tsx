import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { createSupabaseQueryBuilder } from '../test/supabase-mock';
import { usePatientAppointmentDetail } from './use-patient-appointment-detail';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../lib/medication-catalog', () => ({
  hydratePrescriptionItemsWithCatalog: vi.fn((items) => items),
  loadMedicationCatalogRowsForPrescriptionItems: vi.fn(async () => []),
}));

vi.mock('../lib/lab-test-catalog', () => ({
  hydrateLabOrderItemsWithCatalog: vi.fn((items) => items),
  loadLabTestCatalogRowsForLabOrderItems: vi.fn(async () => []),
  loadLabTestCatalogSuggestionRowsForLabOrderItems: vi.fn(async () => []),
}));

const fromMock = vi.mocked(supabase.from);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePatientAppointmentDetail', () => {
  it('returns null without a patient or appointment id', async () => {
    const { result } = renderHook(() => usePatientAppointmentDetail(null, 'appointment-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('loads a patient-owned appointment with linked doctor profile', async () => {
    const builders = {
      appointments: createSupabaseQueryBuilder({
        data: {
          id: 'appointment-1',
          patient_id: 'patient-1',
          doctor_id: 'doctor-1',
          facility_id: null,
          type: 'virtual',
          status: 'scheduled',
          scheduled_at: '2026-07-20T10:00:00Z',
          duration_minutes: 30,
          chief_complaint: 'Follow-up',
          notes: null,
          is_deleted: false,
          deleted_at: null,
          created_at: '2026-07-19T10:00:00Z',
          updated_at: '2026-07-19T10:00:00Z',
        },
        error: null,
      }),
      user_profiles: createSupabaseQueryBuilder({
        data: {
          user_id: 'doctor-1',
          full_name: 'Dr One',
          city: 'Dubai',
          address: 'Clinic Street',
        },
        error: null,
      }),
      doctor_profiles: createSupabaseQueryBuilder({
        data: {
          user_id: 'doctor-1',
          specialization: 'Cardiology',
        },
        error: null,
      }),
      consultation_notes: createSupabaseQueryBuilder({ data: [], error: null }),
      appointment_pre_visit_assessments: createSupabaseQueryBuilder({ data: null, error: null }),
      prescriptions: createSupabaseQueryBuilder({ data: [], error: null }),
      lab_orders: createSupabaseQueryBuilder({ data: [], error: null }),
    };

    fromMock.mockImplementation(((table: keyof typeof builders) => {
      const builder = builders[table];
      if (!builder) {
        throw new Error(`Unexpected table ${String(table)}`);
      }
      return builder;
    }) as never);

    const { result } = renderHook(() => usePatientAppointmentDetail('patient-1', 'appointment-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(builders.appointments.eq).toHaveBeenCalledWith('id', 'appointment-1');
    expect(builders.appointments.eq).toHaveBeenCalledWith('patient_id', 'patient-1');
    expect(result.current.data?.doctorProfile).toEqual({
      userId: 'doctor-1',
      fullName: 'Dr One',
      specialty: 'Cardiology',
      city: 'Dubai',
      address: 'Clinic Street',
    });
    expect(result.current.data?.prescriptions).toEqual([]);
    expect(result.current.data?.labOrders).toEqual([]);
  });
});
